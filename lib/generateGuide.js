import { connectDB } from "@/lib/db";
import GuidePurchase from "@/models/GuidePurchase";
import Guide from "@/models/Guide";
import Questionnaire from "@/models/Questionnaire";
import PlanTemplate from "@/models/PlanTemplate";
import KnowledgeSource from "@/models/KnowledgeSource";
import { generateSectionContent } from "@/lib/openai";
import { renderGuidePdf } from "@/lib/pdf";
import { uploadRawBufferToCloudinary } from "@/lib/cloudinary";

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

    const knowledgeSources = template.knowledgeSourceIds.length
      ? await KnowledgeSource.find({ _id: { $in: template.knowledgeSourceIds }, reviewStatus: "approved" }).lean()
      : [];

    const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);

    const generatedSections = [];
    for (const section of sortedSections) {
      const body = await generateSectionContent({
        guideTitle: guide.title,
        questions: questionnaire.questions,
        answers: purchase.assessmentAnswers,
        section,
        knowledgeSources,
      });
      generatedSections.push({ title: section.title, body });
    }

    const pdfBytes = await renderGuidePdf({
      title: guide.title,
      objectives: template.objectives,
      sections: generatedSections,
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
