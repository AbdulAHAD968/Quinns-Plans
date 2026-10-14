import { getOrCreateVisitorSession, logEvent } from "@/lib/visitor";

const VALID_TYPES = ["page_view", "category_view", "guide_view", "assessment_start", "assessment_step", "assessment_complete", "checkout_start", "payment_failed"];

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }

  const { type, meta } = body;
  if (!VALID_TYPES.includes(type)) return Response.json({ error: "Invalid event type." }, { status: 400 });

  const session = await getOrCreateVisitorSession(req);
  await logEvent(session, type, meta || {});

  return Response.json({ ok: true, sessionId: session.sessionId });
}
