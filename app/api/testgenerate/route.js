// TEMPORARY smoke-test route, not part of the product. Deleted after use.
import { connectDB } from "@/lib/db";
import Guide from "@/models/Guide";
import GuidePurchase from "@/models/GuidePurchase";
import { generateGuideForPurchase } from "@/lib/generateGuide";
import { getPrivateDownloadUrl } from "@/lib/cloudinary";

const SCENARIOS = {
  "7-day-meal-prep-guide": {
    household_size: "2",
    dietary_preferences: ["vegetarian"],
    allergies: "peanuts",
    cooking_time: "20_40",
    food_budget: "75_150",
  },
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug || !SCENARIOS[slug]) {
    return Response.json({ error: "Pass ?slug=<guide-slug>", available: Object.keys(SCENARIOS) }, { status: 400 });
  }

  await connectDB();

  const guide = await Guide.findOne({ slug });
  if (!guide) return Response.json({ error: `Guide '${slug}' not found` }, { status: 404 });

  const purchase = await GuidePurchase.create({
    guideId: guide._id,
    assessmentAnswers: SCENARIOS[slug],
    templateVersionSnapshot: 3,
    downloadTokenHash: "keep-this-one-v3",
    amountCents: guide.priceCents,
    currency: guide.currency,
    status: "paid",
    customerEmail: "review@example.com",
  });

  const result = await generateGuideForPurchase(purchase._id);
  const downloadUrl = result.generationStatus === "ready" ? getPrivateDownloadUrl(result.generatedFileUrl) : null;

  return Response.json({
    guideTitle: guide.title,
    purchaseId: purchase._id.toString(),
    generationStatus: result.generationStatus,
    generationError: result.generationError,
    publicId: result.generatedFileUrl,
    downloadUrl,
  });
}
