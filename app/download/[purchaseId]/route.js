import { connectDB } from "@/lib/db";
import GuidePurchase from "@/models/GuidePurchase";
import { isValidToken } from "@/lib/downloadToken";
import { getPrivateDownloadUrl } from "@/lib/cloudinary";

export async function GET(req, { params }) {
  const { purchaseId } = await params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  await connectDB();

  const purchase = await GuidePurchase.findById(purchaseId).populate("guideId", "title slug");
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

  const format = purchase.generatedFileFormat || "pdf";
  const guideTitle = purchase.guideId?.title || "Personalized-Guide";
  const safeTitle = guideTitle.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  const downloadFilename = `${safeTitle || "Personalized-Guide"}.${format}`;

  const signedUrl = getPrivateDownloadUrl(purchase.generatedFileUrl);

  try {
    const upstream = await fetch(signedUrl);
    if (!upstream.ok) {
      // Fallback redirect if upstream fetch fails
      return Response.redirect(signedUrl, 302);
    }

    const contentType =
      format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Failed to stream download, falling back to direct redirect:", err);
    return Response.redirect(signedUrl, 302);
  }
}
