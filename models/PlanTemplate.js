import mongoose from "mongoose";

const SectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    contentRules: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const PlanTemplateSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "GuideCategory", required: true },
    version: { type: Number, required: true },
    isPublished: { type: Boolean, default: false },
    title: { type: String, required: true, trim: true },
    objectives: { type: [String], default: [] },
    sections: { type: [SectionSchema], default: [] },
    durationOptions: { type: [String], default: [] },
    knowledgeSourceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "KnowledgeSource" }],
  },
  { timestamps: true }
);

export default mongoose.models.PlanTemplate || mongoose.model("PlanTemplate", PlanTemplateSchema);
