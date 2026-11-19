// Generates one real guide for any template with auto-filled sample answers,
// writes the PDF to disk and removes the test purchase.
//   node --env-file=.env --import ./scripts/register-alias.mjs scripts/generate-sample.mjs <guideId> out.pdf
import mongoose from "mongoose";
import Guide from "../models/Guide.js";
import GuidePurchase from "../models/GuidePurchase.js";
import PlanTemplate from "../models/PlanTemplate.js";
import Questionnaire from "../models/Questionnaire.js";
import { generateGuideForPurchase } from "../lib/generateGuide.js";

const [guideId, out] = process.argv.slice(2);
process.env.GUIDE_DEBUG_PDF_PATH = out;
await mongoose.connect(process.env.MONGODB_URL);
const guide = await Guide.findById(guideId);
const template = await PlanTemplate.findById(guide.templateId);
const q = await Questionnaire.findById(guide.questionnaireId).lean();
const answers = {};
for (const x of q.questions) {
  const opts = (x.options || []).map((o) => o.value ?? o);
  if (x.type === "multi_select") answers[x.key] = opts.slice(0, 2);
  else if (x.type === "single_select") answers[x.key] = opts[Math.min(1, opts.length - 1)];
  else if (x.type === "date") answers[x.key] = "2026-12-30";
  else if (x.type === "number") answers[x.key] = 30;
  else answers[x.key] = /name/i.test(x.key) ? "Sarah" : "Sample answer";
}
console.log(JSON.stringify(answers));
const purchase = await GuidePurchase.create({ guideId: guide._id, templateVersionSnapshot: template.version ?? 1, amountCents: 0, status: "paid", customerEmail: "test@example.com", assessmentAnswers: answers });
const t0 = Date.now();
try {
  const done = await generateGuideForPurchase(purchase._id);
  console.log(`Done in ${Math.round((Date.now() - t0) / 1000)}s ->`, out, JSON.stringify(done.generationReport));
} finally {
  await GuidePurchase.deleteOne({ _id: purchase._id });
}
process.exit(0);
