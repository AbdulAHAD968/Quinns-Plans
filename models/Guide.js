import mongoose from "mongoose";

const GuideSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "GuideCategory", required: true },
    questionnaireId: { type: mongoose.Schema.Types.ObjectId, ref: "Questionnaire", required: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "PlanTemplate", required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    priceCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "usd" },
    stripeProductId: { type: String, default: "" },
    stripePriceId: { type: String, default: "" },
    formats: { type: String, enum: ["pdf", "docx", "both"], default: "pdf" },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Guide || mongoose.model("Guide", GuideSchema);
