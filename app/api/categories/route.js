import { connectDB } from "@/lib/db";
import GuideCategory from "@/models/GuideCategory";

export async function GET() {
  await connectDB();
  const categories = await GuideCategory.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
  return Response.json(categories);
}
