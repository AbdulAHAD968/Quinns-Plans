import { connectDB } from "@/lib/db";
import Guide from "@/models/Guide";
import GuideCategory from "@/models/GuideCategory"; // required by Guide.populate("categoryId") below
import Questionnaire from "@/models/Questionnaire";

void GuideCategory;

export async function GET(req, { params }) {
  const { slug } = await params;
  await connectDB();

  const guide = await Guide.findOne({ slug, status: "published", isActive: true }).populate("categoryId", "name slug");
  if (!guide) return Response.json({ error: "Guide not found." }, { status: 404 });

  const questionnaire = await Questionnaire.findById(guide.questionnaireId);
  if (!questionnaire || !questionnaire.isPublished) {
    return Response.json({ error: "This guide is not currently available." }, { status: 404 });
  }

  return Response.json({ guide, questionnaire });
}
