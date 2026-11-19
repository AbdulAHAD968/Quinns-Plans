import mongoose from "mongoose";
import GuideCategory from "../models/GuideCategory.js";
import Guide from "../models/Guide.js";
import PlanTemplate from "../models/PlanTemplate.js";
await mongoose.connect(process.env.MONGODB_URL);
const cats = await GuideCategory.find().lean();
const guides = await Guide.find().lean();
for (const g of guides) {
  const c = cats.find((x) => String(x._id) === String(g.categoryId));
  const t = await PlanTemplate.findById(g.templateId).lean();
  console.log(String(g._id), "|", c?.name, "|", g.title, "|", g.status, "| sections:", t?.sections?.length);
}
process.exit(0);
