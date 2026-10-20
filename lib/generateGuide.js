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

    for (const section of sortedSections) {
      // Sections that need to reconcile against earlier content (e.g. a
      // shopping list that must sum actual recipe ingredients) get the
      // recipes generated so far. Only recipe blocks are passed, not full
      // section text, to keep the prompt focused and bounded in size.
      const priorRecipes = generatedSections.flatMap((s) => s.blocks.filter((b) => b.type === "recipe"));

      const blocks = await generateSectionContent({
        guideTitle: guide.title,
        questions: questionnaire.questions,
        answers: purchase.assessmentAnswers,
        section,
        knowledgeSources,
        priorRecipes,
      });

      if (imagesRemaining > 0) {
        const illustrable = extractIllustrableItems(blocks);
        for (const item of illustrable) {
          if (imagesRemaining <= 0) break;
          const block = blocks.find((b) => b.type === "recipe" && b.name === item.name);
          if (!block) continue;
          try {
            block.imageBytes = await generateItemImage({
              guideTitle: guide.title,
              categoryName,
              itemName: item.name,
              itemDescription: item.description,
            });
            imagesRemaining -= 1;
          } catch (err) {
            // A single failed image is not worth failing the whole guide over.
            console.error(`Item image generation failed for "${item.name}" (purchase ${purchaseId}):`, err);
          }
        }
      }

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
