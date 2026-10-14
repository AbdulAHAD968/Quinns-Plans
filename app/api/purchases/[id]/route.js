import { connectDB } from "@/lib/db";
import GuidePurchase from "@/models/GuidePurchase";

export async function GET(req, { params }) {
  const { id } = await params;
  await connectDB();

  const purchase = await GuidePurchase.findById(id).populate("guideId", "title formats");
  if (!purchase) return Response.json({ error: "Purchase not found." }, { status: 404 });

  return Response.json({
    status: purchase.status,
    generationStatus: purchase.generationStatus,
    generationError: purchase.generationError,
    guideTitle: purchase.guideId?.title || "",
    downloadReady: purchase.generationStatus === "ready" && !!purchase.generatedFileUrl,
  });
}
