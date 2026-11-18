import fs from "fs";
import { connectDB } from "@/lib/db";
import GuidePurchase from "@/models/GuidePurchase";
import Guide from "@/models/Guide";
import GuideCategory from "@/models/GuideCategory";
import Questionnaire from "@/models/Questionnaire";
import PlanTemplate from "@/models/PlanTemplate";
import KnowledgeSource from "@/models/KnowledgeSource";
import AffiliateProduct from "@/models/AffiliateProduct";
import { generateSectionContent, extractIllustrableItems, reviseSectionBlocks } from "@/lib/openai";
import { buildTripFacts, describeTripFacts, normalizeTripBlocks, buildCoverMeta, TRAVEL_RULES, TRAVEL_SLUG } from "@/lib/travel";
import { findIssues } from "@/lib/qc";
import { fetchApprovedImage } from "@/lib/safeImage";
import { generateCoverImage, generateItemImage, generateVerifiedProductImage } from "@/lib/openaiImage";
import { renderGuidePdf } from "@/lib/pdf";
import { renderGuidePdfMagazine } from "@/lib/pdfMagazine";
import { uploadRawBufferToCloudinary } from "@/lib/cloudinary";

// Caps total image-generation calls per guide so a template with many
// illustrable items (e.g. 21 recipes) can't run away with cost/time; the
// first N items get images, the rest render as plain recipe blocks.
const MAX_ITEM_IMAGES_PER_GUIDE = 5;
const MAX_PRODUCT_IMAGES_PER_GUIDE = 24;
const SEQUENTIAL_LEAD = 2;

export async function generateGuideForPurchase(purchaseId) {
  await connectDB();

  const purchase = await GuidePurchase.findById(purchaseId);
  if (!purchase) throw new Error(`Purchase ${purchaseId} not found.`);
  if (purchase.status !== "paid") throw new Error(`Purchase ${purchaseId} is not paid.`);
  if (purchase.generationStatus === "ready") return purchase;

  purchase.generationStatus = "generating";
  purchase.generationError = "";
  await purchase.save();

  try {
    const guide = await Guide.findById(purchase.guideId);
    if (!guide) throw new Error("Guide not found.");

    const questionnaire = await Questionnaire.findById(guide.questionnaireId);
    if (!questionnaire) throw new Error("Questionnaire not found.");

    const template = await PlanTemplate.findById(guide.templateId);
    if (!template) throw new Error("Plan template not found.");

    const category = await GuideCategory.findById(guide.categoryId).lean();

    const knowledgeSources = template.knowledgeSourceIds.length
      ? await KnowledgeSource.find({ _id: { $in: template.knowledgeSourceIds }, reviewStatus: "approved" }).lean()
      : [];

    const needsCatalog = template.sections.some((sec) => /product_picks/.test(sec.contentRules || ""));
    const catalog = needsCatalog
      ? (await AffiliateProduct.find({ isActive: true }).limit(150).lean()).map((p) => ({
          id: String(p._id), name: p.name, brand: p.brand, tier: p.tier, priceRange: p.priceRange, description: p.description, imageUrl: p.imageUrl, group: p.group, benefit: p.benefit, url: p.affiliateUrl,
        }))
      : [];

    const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);
    const categoryName = category?.name || "";

    // Travel guides get computed trip facts (real dates, typical weather,
    // consistent quantities) and a vetted airline-rules sheet injected into
    // every section, plus a quality-control pass before rendering.
    const answers = purchase.assessmentAnswers;
    const isTravel = category?.slug === TRAVEL_SLUG;
    const facts = isTravel ? await buildTripFacts(answers) : null;
    const extraContext = facts ? [describeTripFacts(facts), TRAVEL_RULES].join("\n\n") : "";

    const generateOne = async (section, priorSections) => {
      let blocks = await generateSectionContent({
        guideTitle: guide.title,
        questions: questionnaire.questions,
        answers,
        section,
        knowledgeSources,
        priorSections,
        catalog,
        extraContext,
      });
      if (facts) blocks = normalizeTripBlocks(blocks, facts);
      return { title: section.title, blocks };
    };

    // Each later section gets a digest of earlier ones so numbers and names stay
    // consistent. Travel guides generate the first SEQUENTIAL_LEAD sections in
    // order (overview + packing list set the quantities), then the rest in
    // parallel against that digest to stay fast.
    const generatedSections = [];
    const lead = facts ? SEQUENTIAL_LEAD : sortedSections.length;
    for (const section of sortedSections.slice(0, lead)) {
      generatedSections.push(await generateOne(section, generatedSections));
    }
    if (sortedSections.length > lead) {
      const priors = [...generatedSections];
      const rest = await Promise.all(sortedSections.slice(lead).map((section) => generateOne(section, priors)));
      generatedSections.push(...rest);
    }

    const qcReport = { issuesRemaining: [], sectionsRevised: 0 };
    if (facts) {
      await Promise.all(
        generatedSections.map(async (sec) => {
          try {
            const issues = findIssues(sec.blocks, facts);
            const revised = await reviseSectionBlocks({ sectionTitle: sec.title, blocks: sec.blocks, facts: describeTripFacts(facts), rules: TRAVEL_RULES, issues });
            sec.blocks = normalizeTripBlocks(revised, facts);
            let remaining = findIssues(sec.blocks, facts);
            if (remaining.length) {
              // One more targeted pass on whatever the first review left behind.
              const again = await reviseSectionBlocks({ sectionTitle: sec.title, blocks: sec.blocks, facts: describeTripFacts(facts), rules: TRAVEL_RULES, issues: remaining });
              sec.blocks = normalizeTripBlocks(again, facts);
              remaining = findIssues(sec.blocks, facts);
            }
            qcReport.issuesRemaining.push(...remaining.map((r) => `${sec.title}: ${r}`.slice(0, 300)));
            if (remaining.length) console.warn(`QC: ${remaining.length} issue(s) remain in "${sec.title}" (purchase ${purchaseId}):`, remaining);
          } catch (err) {
            console.error(`QC pass failed for "${sec.title}" (purchase ${purchaseId}):`, err);
          }
        })
      );
    }

    // Curated products use the approved photo from the catalog; they are never
    // given an AI-generated image (a generated "Samsonite" would not be one).
    await Promise.all(
      generatedSections.flatMap((sec) =>
        sec.blocks
          .filter((b) => b.type === "product_picks")
          .flatMap((b) => b.products.filter((pr) => pr.curated && pr.imageUrl))
          .map(async (pr) => { pr.imageBytes = await fetchApprovedImage(pr.imageUrl); })
      )
    );

    // Illustrations run after QC so images match the final product list.
    const allItems = generatedSections.flatMap((sec) => extractIllustrableItems(sec.blocks));
    const recipeItems = allItems.filter((i) => i.target.ingredients);
    const productItems = allItems.filter((i) => !i.target.ingredients).slice(0, MAX_PRODUCT_IMAGES_PER_GUIDE);

    let imagesDropped = 0;
    const makeImage = async (item) => {
      try {
        const isProduct = !item.target.ingredients;
        const bytes = isProduct
          ? await generateVerifiedProductImage({ guideTitle: guide.title, categoryName, itemName: item.name, itemDescription: item.description, hint: item.target.imageHint })
          : await generateItemImage({ guideTitle: guide.title, categoryName, itemName: item.name, itemDescription: item.description });
        if (!bytes) { imagesDropped += 1; return false; }
        item.target.imageBytes = bytes;
        return true;
      } catch (err) {
        // A single failed image is not worth failing the whole guide over.
        console.error(`Item image generation failed for "${item.name}" (purchase ${purchaseId}):`, err);
        return false;
      }
    };

    let imagesRemaining = MAX_ITEM_IMAGES_PER_GUIDE;
    for (const item of recipeItems) {
      if (imagesRemaining <= 0) break;
      if (await makeImage(item)) imagesRemaining -= 1;
    }
    // Product cards are the visual point of a shoppable section, so every
    // product gets an image; generated concurrently in small batches.
    for (let i = 0; i < productItems.length; i += 6) {
      await Promise.all(productItems.slice(i, i + 6).map(makeImage));
    }

    let coverImageBytes = null;
    try {
      coverImageBytes = await generateCoverImage({ guideTitle: guide.title, categoryName });
    } catch (err) {
      console.error(`Cover image generation failed (purchase ${purchaseId}):`, err);
    }

    const pdfArgs = {
      title: guide.title,
      categoryName,
      objectives: template.objectives,
      durationLabel: template.durationOptions?.[0] ? `${template.durationOptions[0]} plan` : null,
      sections: generatedSections,
      coverImageBytes,
      cover: facts ? buildCoverMeta(facts, guide.title) : null,
    };
    // Magazine layout first; if it ever fails, fall back to the plain layout so
    // the customer still receives their guide.
    let pdfBytes;
    try {
      pdfBytes = await renderGuidePdfMagazine(pdfArgs);
    } catch (err) {
      console.error(`Magazine PDF failed, using plain layout (purchase ${purchaseId}):`, err);
      pdfBytes = await renderGuidePdf(pdfArgs);
    }

    const filename = `guide-${purchase._id}.pdf`;
    // Local review runs (scripts/test-travel-guide.mjs) write the file to disk and skip the upload.
    let upload;
    if (process.env.GUIDE_DEBUG_PDF_PATH) {
      fs.writeFileSync(process.env.GUIDE_DEBUG_PDF_PATH, pdfBytes);
      upload = { public_id: "debug-not-uploaded" };
    } else {
      upload = await uploadRawBufferToCloudinary(Buffer.from(pdfBytes), { filename });
    }

    purchase.generatedFileUrl = upload.public_id;
    purchase.generatedFileFormat = "pdf";
    purchase.generationStatus = "ready";
    purchase.generationError = "";
    // Searchable record of what was auto-checked and which products still lack a curated link.
    const searchOnly = [...new Set(generatedSections.flatMap((sec) => sec.blocks.filter((b) => b.type === "product_picks").flatMap((b) => b.products.filter((pr) => !pr.curated).map((pr) => pr.name))))];
    purchase.generationReport = {
      qcIssuesRemaining: qcReport.issuesRemaining.slice(0, 20),
      imagesDropped,
      searchOnlyProducts: searchOnly.slice(0, 40),
    };
    await purchase.save();
    return purchase;
  } catch (err) {
    console.error(`Guide generation failed for purchase ${purchaseId}:`, err);
    purchase.generationStatus = "failed";
    purchase.generationError = "Something went wrong while generating this guide. Our team has been notified.";
    await purchase.save();
    throw err;
  }
}
