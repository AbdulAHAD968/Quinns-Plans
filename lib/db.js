import mongoose from "mongoose";

// Register all schemas on mongoose so cross-model .populate() calls never fail
import "@/models/GuideCategory";
import "@/models/Questionnaire";
import "@/models/PlanTemplate";
import "@/models/Guide";
import "@/models/GuidePurchase";
import "@/models/KnowledgeSource";
import "@/models/VisitorSession";

const MONGODB_URL = process.env.MONGODB_URL;

let cached = global._mongoose || { conn: null, promise: null };
global._mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URL, { bufferCommands: false });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
