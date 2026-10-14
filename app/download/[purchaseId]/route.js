import { connectDB } from "@/lib/db";
import GuidePurchase from "@/models/GuidePurchase";
import { isValidToken } from "@/lib/downloadToken";

export async function GET(req, { params }) {
  const { purchaseId } = await params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  await connectDB();

  const purchase = await GuidePurchase.findById(purchaseId);
  if (!purchase || !isValidToken(purchase.downloadTokenHash, token)) {
    return Response.json({ error: "Purchase not found." }, { status: 404 });
  }
  if (purchase.status !== "paid") return Response.json({ error: "Payment not confirmed." }, { status: 403 });
  if (purchase.generationStatus !== "ready" || !purchase.generatedFileUrl) {
    return Response.json({ error: "Guide is not ready yet." }, { status: 409 });
  }

  purchase.downloadCount += 1;
  purchase.lastDownloadedAt = new Date();
  await purchase.save();

  return Response.redirect(purchase.generatedFileUrl, 302);
}
