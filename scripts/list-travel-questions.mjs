import mongoose from "mongoose";
import GuideCategory from "../models/GuideCategory.js";
import Guide from "../models/Guide.js";
import Questionnaire from "../models/Questionnaire.js";
await mongoose.connect(process.env.MONGODB_URL);
const cat = await GuideCategory.findOne({ slug: (await import("../lib/travel.js")).TRAVEL_SLUG }).lean();
const guides = await Guide.find({ categoryId: cat._id }).lean();
for (const g of guides) {
  const q = await Questionnaire.findById(g.questionnaireId).lean();
  console.log(String(g._id), g.title, g.status ?? "", "templateId", String(g.templateId));
  if (q) for (const x of q.questions) console.log("  ", x.key, x.type, "|", x.label || x.text, "|", (x.options || []).map((o) => (o.value ?? o) + "=" + (o.label ?? o)).join(", "));
}
process.exit(0);
