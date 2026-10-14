import { connectDB } from "@/lib/db";
import GuidePurchase from "@/models/GuidePurchase";
import { stripe } from "@/lib/stripe";

export async function POST(req) {
  const signature = req.headers.get("stripe-signature");
  const payload = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  await connectDB();

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const checkoutSession = event.data.object;
    if (checkoutSession.payment_status === "unpaid") {
      return Response.json({ received: true });
    }

    const purchase = await GuidePurchase.findOne({ stripeSessionId: checkoutSession.id });
    if (purchase && purchase.status !== "paid") {
      purchase.status = "paid";
      purchase.stripePaymentIntentId = checkoutSession.payment_intent || "";
      purchase.customerEmail = purchase.customerEmail || checkoutSession.customer_details?.email || "";
      purchase.generationStatus = "pending";
      await purchase.save();
      // Guide generation (AI content + PDF/DOCX render) is triggered by a separate
      // background worker reading generationStatus: "pending" purchases, not inline here.
    }
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const checkoutSession = event.data.object;
    const purchase = await GuidePurchase.findOne({ stripeSessionId: checkoutSession.id });
    if (purchase) {
      purchase.status = "failed";
      await purchase.save();
    }
  }

  return Response.json({ received: true });
}
