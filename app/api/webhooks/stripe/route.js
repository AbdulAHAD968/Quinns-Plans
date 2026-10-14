import { after } from "next/server";
import { connectDB } from "@/lib/db";
import GuidePurchase from "@/models/GuidePurchase";
import Guide from "@/models/Guide";
import { stripe } from "@/lib/stripe";
import { generateGuideForPurchase } from "@/lib/generateGuide";
import { sendGuideDeliveryEmail } from "@/lib/email";

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

      // Scheduled to run after this response is sent (Vercel keeps the function
      // alive for it), so Stripe gets a fast ack regardless of how long
      // OpenAI/PDF rendering/Cloudinary take.
      const purchaseId = purchase._id;
      const customerEmail = purchase.customerEmail;
      const rawToken = checkoutSession.metadata?.token || "";
      const origin = process.env.CLIENT_URL || "https://plans.bodybyquinn.com";

      after(async () => {
        try {
          const generated = await generateGuideForPurchase(purchaseId);
          if (generated?.generationStatus === "ready" && customerEmail) {
            const guide = await Guide.findById(purchase.guideId);
            const guideTitle = guide?.title || "Personalized Guide";
            const downloadUrl = `${origin}/download/${purchaseId}?token=${encodeURIComponent(rawToken)}`;
            const successUrl = `${origin}/success?purchase_id=${purchaseId}&token=${encodeURIComponent(rawToken)}`;

            await sendGuideDeliveryEmail({
              toEmail: customerEmail,
              guideTitle,
              downloadUrl,
              successUrl,
            });
          }
        } catch (err) {
          console.error("Post-payment guide processing error:", err);
        }
      });
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
