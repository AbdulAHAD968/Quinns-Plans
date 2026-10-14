import { connectDB } from "@/lib/db";
import GuidePurchase from "@/models/GuidePurchase";
import { isValidToken } from "@/lib/downloadToken";

export async function GET(req, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  await connectDB();

  const purchase = await GuidePurchase.findById(id).populate("guideId", "title formats");
  if (!purchase || !isValidToken(purchase.downloadToken, token)) {
    return Response.json({ error: "Purchase not found." }, { status: 404 });
  }

  return Response.json({
    status: purchase.status,
    generationStatus: purchase.generationStatus,
    generationError: purchase.generationError,
    guideTitle: purchase.guideId?.title || "",
    downloadReady: purchase.generationStatus === "ready" && !!purchase.generatedFileUrl,
  });
}
