import mongoose from "mongoose";

const AffiliateProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    affiliateUrl: { type: String, required: true, trim: true },
    group: { type: String, default: "", trim: true },
    benefit: { type: String, default: "", trim: true },
    brand: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    tier: { type: String, enum: ["budget", "premium", "luxury"], default: "budget" },
    priceRange: { type: String, default: "", trim: true },
    imageUrl: { type: String, default: "", trim: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "GuideCategory" },
    isActive: { type: Boolean, default: true },
    clickCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.AffiliateProduct || mongoose.model("AffiliateProduct", AffiliateProductSchema);
