import mongoose from "mongoose";

const GuidePurchaseSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "VisitorSession" },
    guideId: { type: mongoose.Schema.Types.ObjectId, ref: "Guide", required: true },
    assessmentAnswers: { type: mongoose.Schema.Types.Mixed, required: true },
    templateVersionSnapshot: { type: Number, required: true },
    stripeSessionId: { type: String, default: "" },
    stripePaymentIntentId: { type: String, default: "" },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    customerEmail: { type: String, default: "", trim: true, lowercase: true },
    generatedFileUrl: { type: String, default: "" },
    generatedFileFormat: { type: String, enum: ["pdf", "docx"], default: "pdf" },
    downloadCount: { type: Number, default: 0 },
    lastDownloadedAt: { type: Date },
    generationStatus: { type: String, enum: ["pending", "generating", "ready", "failed"], default: "pending" },
    generationError: { type: String, default: "" },
  },
  { timestamps: true }
);

GuidePurchaseSchema.index({ stripeSessionId: 1 });

export default mongoose.models.GuidePurchase || mongoose.model("GuidePurchase", GuidePurchaseSchema);
