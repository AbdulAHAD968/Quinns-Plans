import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Guide from "@/models/Guide";
import Questionnaire from "@/models/Questionnaire";
import AssessmentFlow from "@/app/components/AssessmentFlow";

export default async function AssessmentPage({ params }) {
  const { slug } = await params;
  await connectDB();

  const guide = await Guide.findOne({ slug, status: "published", isActive: true }).lean();
  if (!guide) notFound();

  const questionnaire = await Questionnaire.findById(guide.questionnaireId).lean();
  if (!questionnaire || !questionnaire.isPublished) notFound();

  const sortedQuestions = [...questionnaire.questions].sort((a, b) => a.order - b.order);

  return (
    <AssessmentFlow
      guide={{ slug: guide.slug, title: guide.title, priceCents: guide.priceCents, currency: guide.currency }}
      questions={sortedQuestions}
    />
  );
}
