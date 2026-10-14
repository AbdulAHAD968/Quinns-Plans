import mongoose from "mongoose";

const KnowledgeSourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, default: "", trim: true },
    excerpt: { type: String, default: "" },
    category: { type: String, default: "", trim: true },
    reviewStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    reviewedAt: { type: Date },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.models.KnowledgeSource || mongoose.model("KnowledgeSource", KnowledgeSourceSchema);
