import mongoose from "mongoose";

const QuestionOptionSchema = new mongoose.Schema(
  { value: { type: String, required: true }, label: { type: String, required: true } },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ["single_select", "multi_select", "number", "text", "scale"], required: true },
    options: { type: [QuestionOptionSchema], default: [] },
    required: { type: Boolean, default: true },
    conditionalOn: {
      questionKey: { type: String, default: "" },
      operator: { type: String, enum: ["equals", "in", "not_equals"], default: "equals" },
      value: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const QuestionnaireSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "GuideCategory", required: true },
    version: { type: Number, required: true },
    isPublished: { type: Boolean, default: false },
    questions: { type: [QuestionSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Questionnaire || mongoose.model("Questionnaire", QuestionnaireSchema);
