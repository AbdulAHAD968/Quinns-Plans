import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["page_view", "category_view", "guide_view", "assessment_start", "assessment_step", "assessment_complete", "checkout_start", "payment_failed"],
      required: true,
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const VisitorSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    referrer: { type: String, default: "" },
    categoryViewed: { type: String, default: "" },
    guideViewed: { type: mongoose.Schema.Types.ObjectId, ref: "Guide" },
    assessmentStarted: { type: Boolean, default: false },
    assessmentCompleted: { type: Boolean, default: false },
    lastStep: { type: Number, default: 0 },
    abandonedAt: { type: Date },
    events: { type: [EventSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.VisitorSession || mongoose.model("VisitorSession", VisitorSessionSchema);
