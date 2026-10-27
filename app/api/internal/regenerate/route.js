import { after } from "next/server";
import { timingSafeEqual } from "crypto";
import { connectDB } from "@/lib/db";
import GuidePurchase from "@/models/GuidePurchase";
import { generateGuideForPurchase } from "@/lib/generateGuide";

// Generation can take a while (OpenAI + images + PDF); allow the background job to finish.
export const maxDuration = 300;

function authorized(req) {
  const secret = process.env.PLANS_INTERNAL_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Called by the admin app to re-run generation for a paid purchase whose guide failed.
export async function POST(req) {
  if (!authorized(req)) return Response.json({ error: "Unauthorized." }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const purchaseId = typeof body?.purchaseId === "string" ? body.purchaseId : "";
  if (!/^[a-f0-9]{24}$/i.test(purchaseId)) return Response.json({ error: "Invalid purchase id." }, { status: 400 });

  await connectDB();
  const purchase = await GuidePurchase.findById(purchaseId);
  if (!purchase) return Response.json({ error: "Purchase not found." }, { status: 404 });
  if (purchase.status !== "paid") return Response.json({ error: "Purchase is not paid." }, { status: 409 });
  if (purchase.generationStatus === "ready") return Response.json({ error: "Already generated." }, { status: 409 });

  const STALE_MS = 6 * 60 * 1000;
  if (purchase.generationStatus === "generating" && Date.now() - purchase.updatedAt.getTime() < STALE_MS) {
    return Response.json({ error: "Generation is still running. Try again in a few minutes." }, { status: 409 });
  }

  purchase.generationStatus = "pending";
  purchase.generationError = "";
  await purchase.save();

  after(async () => {
    try {
      await generateGuideForPurchase(purchase._id);
    } catch (err) {
      console.error("Manual regeneration error:", err);
    }
  });

  return Response.json({ ok: true });
}
