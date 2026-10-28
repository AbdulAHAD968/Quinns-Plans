import { connectDB } from "@/lib/db";
import Guide from "@/models/Guide";
import Questionnaire from "@/models/Questionnaire";
import PlanTemplate from "@/models/PlanTemplate";
import GuidePurchase from "@/models/GuidePurchase";
import { stripe } from "@/lib/stripe";
import { getOrCreateVisitorSession, logEvent } from "@/lib/visitor";
import { generateDownloadToken } from "@/lib/downloadToken";

function isAnswerPresent(value) {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }

  const { guideSlug, answers, customerEmail } = body;
  if (!guideSlug || !answers) return Response.json({ error: "guideSlug and answers are required." }, { status: 400 });

  await connectDB();

  const guide = await Guide.findOne({ slug: guideSlug, status: "published", isActive: true });
  if (!guide) return Response.json({ error: "Guide not found or no longer available." }, { status: 404 });

  const questionnaire = await Questionnaire.findById(guide.questionnaireId);
  if (!questionnaire || !questionnaire.isPublished) {
    return Response.json({ error: "This guide's assessment is not currently available." }, { status: 400 });
  }

  const template = await PlanTemplate.findById(guide.templateId);
  if (!template || !template.isPublished) {
    return Response.json({ error: "This guide is not currently available." }, { status: 400 });
  }

  // Server-side validation: every required question that is actually visible
  // (its conditional, if any, is satisfied by the submitted answers) must have an answer.
  for (const q of questionnaire.questions) {
    if (!q.required) continue;
    if (q.conditionalOn?.questionKey) {
      const dependsOnValue = answers[q.conditionalOn.questionKey];
      const { operator, value } = q.conditionalOn;
      let conditionMet = false;
      if (operator === "equals") conditionMet = dependsOnValue === value;
      else if (operator === "not_equals") conditionMet = dependsOnValue !== value;
      else if (operator === "in") conditionMet = Array.isArray(value) && value.includes(dependsOnValue);
      if (!conditionMet) continue;
    }
    if (!isAnswerPresent(answers[q.key])) {
      return Response.json({ error: `Missing required answer for "${q.label}".` }, { status: 400 });
    }
  }

  // Free-text answers end up in AI prompts and the PDF, so bound their shape.
  for (const q of questionnaire.questions) {
    const v = answers[q.key];
    if (!isAnswerPresent(v)) continue;
    if (q.type === "date" && !(typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)))) {
      return Response.json({ error: `"${q.label}" must be a valid date.` }, { status: 400 });
    }
    if ((q.type === "short_text" && (typeof v !== "string" || v.length > 120)) || (q.type === "text" && (typeof v !== "string" || v.length > 1000))) {
      return Response.json({ error: `"${q.label}" is too long or invalid.` }, { status: 400 });
    }
  }

  const session = await getOrCreateVisitorSession(req);
  await logEvent(session, "checkout_start", { guideSlug });

  const { token: downloadToken, tokenHash: downloadTokenHash } = generateDownloadToken();

  const purchase = await GuidePurchase.create({
    sessionId: session._id,
    guideId: guide._id,
    assessmentAnswers: answers,
    templateVersionSnapshot: template.version,
    downloadTokenHash,
    amountCents: guide.priceCents,
    currency: guide.currency,
    status: "pending",
    customerEmail: customerEmail || "",
  });

  const origin = process.env.CLIENT_URL || "http://localhost:3000";

  const lineItem = guide.stripePriceId
    ? { price: guide.stripePriceId, quantity: 1 }
    : {
        price_data: {
          currency: guide.currency,
          unit_amount: guide.priceCents,
          product_data: { name: guide.title, description: guide.description || undefined },
        },
        quantity: 1,
      };

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [lineItem],
    customer_email: customerEmail || undefined,
    success_url: `${origin}/success?purchase_id=${purchase._id}&token=${downloadToken}`,
    cancel_url: `${origin}/guides/${guide.slug}`,
    metadata: {
      purchaseId: String(purchase._id),
      token: downloadToken,
    },
  });

  purchase.stripeSessionId = checkoutSession.id;
  await purchase.save();

  return Response.json({ url: checkoutSession.url });
}
