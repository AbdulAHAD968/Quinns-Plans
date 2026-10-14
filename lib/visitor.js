import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/db";
import VisitorSession from "@/models/VisitorSession";

const COOKIE_NAME = "visitor_id";

export async function getOrCreateVisitorSession(req) {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionId) {
    sessionId = randomUUID();
    cookieStore.set(COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  await connectDB();
  let session = await VisitorSession.findOne({ sessionId });
  if (!session) {
    session = await VisitorSession.create({
      sessionId,
      ip: req?.headers.get("x-forwarded-for") || "",
      userAgent: req?.headers.get("user-agent") || "",
      referrer: req?.headers.get("referer") || "",
    });
  }
  return session;
}

export async function logEvent(session, type, meta = {}) {
  session.events.push({ type, meta, timestamp: new Date() });
  if (type === "assessment_start") session.assessmentStarted = true;
  if (type === "assessment_complete") session.assessmentCompleted = true;
  if (type === "assessment_step" && typeof meta.step === "number") session.lastStep = meta.step;
  await session.save();
}
