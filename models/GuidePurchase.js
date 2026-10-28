import mongoose from "mongoose";

const GuidePurchaseSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "VisitorSession" },
    guideId: { type: mongoose.Schema.Types.ObjectId, ref: "Guide", required: true },
    assessmentAnswers: { type: mongoose.Schema.Types.Mixed, required: true },
    templateVersionSnapshot: { type: Number, required: true },
    stripeSessionId: { type: String, default: "" },
    stripePaymentIntentId: { type: String, default: "" },
    downloadTokenHash: { type: String, default: "", index: true },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    customerEmail: { type: String, default: "", trim: true, lowercase: true },
    // Stores the Cloudinary public_id of the generated file, NOT a fetchable URL.
    // The actual download URL is derived at request time via a short-lived signed
    // link (see lib/cloudinary.js getPrivateDownloadUrl) so a leaked DB value or
    // log line alone can't be used to pull the file later.
    generatedFileUrl: { type: String, default: "" },
    generatedFileFormat: { type: String, enum: ["pdf", "docx"], default: "pdf" },
    downloadCount: { type: Number, default: 0 },
    lastDownloadedAt: { type: Date },
    generationStatus: { type: String, enum: ["pending", "generating", "ready", "failed"], default: "pending" },
    generationError: { type: String, default: "" },
    generationReport: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

GuidePurchaseSchema.index({ stripeSessionId: 1 });

export default mongoose.models.GuidePurchase || mongoose.model("GuidePurchase", GuidePurchaseSchema);
