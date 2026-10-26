import { connectDB } from "@/lib/db";
import GuidePurchase from "@/models/GuidePurchase";
import Guide from "@/models/Guide";
import GuideCategory from "@/models/GuideCategory";
import Questionnaire from "@/models/Questionnaire";
import PlanTemplate from "@/models/PlanTemplate";
import KnowledgeSource from "@/models/KnowledgeSource";
import { generateSectionContent, extractIllustrableItems } from "@/lib/openai";
import { generateCoverImage, generateItemImage } from "@/lib/openaiImage";
import { renderGuidePdf } from "@/lib/pdf";
import { uploadRawBufferToCloudinary } from "@/lib/cloudinary";

// Caps total image-generation calls per guide so a template with many
// illustrable items (e.g. 21 recipes) can't run away with cost/time; the
// first N items get images, the rest render as plain recipe blocks.
const MAX_ITEM_IMAGES_PER_GUIDE = 5;
const MAX_PRODUCT_IMAGES_PER_GUIDE = 24;

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

    const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);
    const categoryName = category?.name || "";

    const generatedSections = [];
    let imagesRemaining = MAX_ITEM_IMAGES_PER_GUIDE;
    let productImagesUsed = 0;

    for (const section of sortedSections) {
      // Every later section gets a compact digest of what earlier sections
      // already said, so a progression plan can't contradict the weekly
      // schedule, a shopping list can't invent quantities that don't match
      // the actual recipes, etc. -- each section is otherwise generated in
      // total isolation and has no way to know what came before it.
      const blocks = await generateSectionContent({
        guideTitle: guide.title,
        questions: questionnaire.questions,
        answers: purchase.assessmentAnswers,
        section,
        knowledgeSources,
        priorSections: generatedSections,
      });

      const illustrable = extractIllustrableItems(blocks);
      const recipeItems = illustrable.filter((i) => i.target.ingredients);
      const productItems = illustrable.filter((i) => !i.target.ingredients).slice(0, MAX_PRODUCT_IMAGES_PER_GUIDE - productImagesUsed);

      const makeImage = async (item) => {
        try {
          item.target.imageBytes = await generateItemImage({
            guideTitle: guide.title,
            categoryName,
            itemName: item.name,
            itemDescription: item.description,
          });
          return true;
        } catch (err) {
          // A single failed image is not worth failing the whole guide over.
          console.error(`Item image generation failed for "${item.name}" (purchase ${purchaseId}):`, err);
          return false;
        }
      };

      for (const item of recipeItems) {
        if (imagesRemaining <= 0) break;
        if (await makeImage(item)) imagesRemaining -= 1;
      }

      // Product cards are the visual point of a shoppable section, so every
      // product gets an image; they run concurrently to keep generation fast.
      productImagesUsed += productItems.length;
      await Promise.all(productItems.map(makeImage));

      generatedSections.push({ title: section.title, blocks });
    }

    let coverImageBytes = null;
    try {
      coverImageBytes = await generateCoverImage({ guideTitle: guide.title, categoryName });
    } catch (err) {
      console.error(`Cover image generation failed (purchase ${purchaseId}):`, err);
    }

    const pdfBytes = await renderGuidePdf({
      title: guide.title,
      categoryName,
      objectives: template.objectives,
      durationLabel: template.durationOptions?.[0] ? `${template.durationOptions[0]} plan` : null,
      sections: generatedSections,
      coverImageBytes,
    });

    const filename = `guide-${purchase._id}.pdf`;
    const upload = await uploadRawBufferToCloudinary(Buffer.from(pdfBytes), { filename });

    purchase.generatedFileUrl = upload.public_id;
    purchase.generatedFileFormat = "pdf";
    purchase.generationStatus = "ready";
    purchase.generationError = "";
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
