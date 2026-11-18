// Generates one real Travel guide through the normal pipeline (OpenAI calls,
// QC, images, magazine PDF), writes it to disk and removes the test purchase.
//
//   node --env-file=.env --import ./scripts/register-alias.mjs scripts/generate-travel-sample.mjs out.pdf
import mongoose from "mongoose";
import Guide from "../models/Guide.js";
import GuidePurchase from "../models/GuidePurchase.js";
import PlanTemplate from "../models/PlanTemplate.js";
import { generateGuideForPurchase } from "../lib/generateGuide.js";

const out = process.argv[2] || "tmp/travel-test.pdf";
process.env.GUIDE_DEBUG_PDF_PATH = out;
await mongoose.connect(process.env.MONGODB_URL);
const guide = await Guide.findById("6acfb170935fae57e0ad5bae");
const template = await PlanTemplate.findById(guide.templateId);
const purchase = await GuidePurchase.create({
  guideId: guide._id, templateVersionSnapshot: template.version ?? 1, amountCents: 0, status: "paid", customerEmail: "test@example.com",
  assessmentAnswers: {
    customer_name: "Sarah", destination: "Seoul, South Korea", departure_date: "2026-12-30", return_date: "2027-01-10",
    destination_climate: "cold", expected_weather: "", trip_purpose: "leisure", activities: ["sightseeing", "formal_dinners"],
    luggage_limit: "carry_on_only", luggage_details: "", special_items: ["jewelry", "camera", "power_bank", "medication"],
  },
});
const t0 = Date.now();
try {
  const done = await generateGuideForPurchase(purchase._id);
  console.log(`Done in ${Math.round((Date.now() - t0) / 1000)}s ->`, out, JSON.stringify(done.generationReport));
} finally {
  await GuidePurchase.deleteOne({ _id: purchase._id });
}
process.exit(0);
