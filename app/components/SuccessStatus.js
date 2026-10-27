"use client";

import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Download,
  FileText,
  Mail,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Clock,
} from "lucide-react";
import CelebrationConfetti from "./CelebrationConfetti";

const STAGES = [
  { label: "Payment confirmed", detail: "Securely verified with Stripe" },
  { label: "Reading your answers", detail: "Understanding your goals, routine and preferences" },
  { label: "Designing your plan", detail: "Building each section around your real life" },
  { label: "Adding diagrams & visuals", detail: "Charts, timelines and step-by-step flows" },
  { label: "Picking your products", detail: "Hand-chosen recommendations with photos and links" },
  { label: "Finishing & polishing", detail: "Final layout, page by page" },
];
const SECONDS_PER_STAGE = 24;

const WAIT_TIPS = [
  "Nothing here is a template. Every section is written from your answers.",
  "Your guide includes product picks you can shop in one tap.",
  "Tip: save the PDF to your phone so it works offline at the gym, store or airport.",
  "Custom visuals take a little longer to draw. That is the part worth waiting for.",
];

export default function SuccessStatus({ purchaseId, token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  // Drives the staged progress UI while the guide is being built
  useEffect(() => {
    if (data?.downloadReady) return;
    const timer = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [data?.downloadReady]);

  // Poll purchase status
  useEffect(() => {
    if (!purchaseId || !token) {
      setError("Missing purchase reference or security token.");
      return;
    }

    async function poll() {
      try {
        const res = await fetch(`/api/purchases/${purchaseId}?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          setError("We couldn't locate this purchase. Please verify your link.");
          return;
        }
        const json = await res.json();
        setData(json);

        if (json.downloadReady) {
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else if (json.generationStatus === "failed" || json.status === "failed") {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        // Transient network hiccup; keep polling
      }
    }

    poll();
    intervalRef.current = setInterval(poll, 2500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [purchaseId, token]);

  // Error State
  if (error) {
    return (
      <div
        style={{
          backgroundColor: "var(--color-surface-card)",
          border: "1px solid var(--color-hairline)",
          borderRadius: 20,
          padding: "48px 32px",
          textAlign: "center",
          maxWidth: 540,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            backgroundColor: "rgba(184,74,61,0.12)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-error)",
            marginBottom: 20,
          }}
        >
          <AlertTriangle size={32} />
        </div>
        <h1 style={{ fontSize: 26, color: "var(--color-ink)", marginBottom: 12, fontWeight: 500 }}>
          Unable to Load Guide
        </h1>
        <p style={{ color: "var(--color-muted)", fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 10,
            border: "none",
            fontSize: 14.5,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={15} /> Refresh Page
        </button>
      </div>
    );
  }

  // Generation Failed
  if (data?.status === "failed" || data?.generationStatus === "failed") {
    return (
      <div
        style={{
          backgroundColor: "var(--color-surface-card)",
          border: "1px solid var(--color-hairline)",
          borderRadius: 20,
          padding: "48px 32px",
          textAlign: "center",
          maxWidth: 540,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            backgroundColor: "rgba(184,74,61,0.12)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-error)",
            marginBottom: 20,
          }}
        >
          <AlertTriangle size={32} />
        </div>
        <h1 style={{ fontSize: 26, color: "var(--color-ink)", marginBottom: 12, fontWeight: 500 }}>
          {data.status === "failed" ? "Payment Not Confirmed" : "Compilation Encountered a Hitch"}
        </h1>
        <p style={{ color: "var(--color-muted)", fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
          {data.generationError ||
            "We had an issue generating your guide file. Your purchase is safe in our records. Please contact support or refresh to retry."}
        </p>
        <a
          href="mailto:support@bodybyquinn.com"
          className="btn-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 14.5,
          }}
        >
          <Mail size={16} /> Contact Quinn Support
        </a>
      </div>
    );
  }

  // Ready State: CELEBRATION!
  if (data?.downloadReady) {
    const formatName = (data.format || "pdf").toUpperCase();
    return (
      <div className="fade-up" style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        {/* Animated Celebration Confetti Cone */}
        <div style={{ marginBottom: 16 }}>
          <CelebrationConfetti />
        </div>

        {/* Status Pill Badge */}
        <div style={{ marginBottom: 16 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 9999,
              backgroundColor: "rgba(122, 138, 111, 0.15)",
              color: "var(--color-accent-sage, #5f8f5a)",
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
            }}
          >
            <Sparkles size={14} /> Plan Ready for Download
          </span>
        </div>

        <h1
          style={{
            fontSize: "clamp(30px, 4.5vw, 40px)",
            fontWeight: 500,
            color: "var(--color-ink)",
            marginBottom: 10,
            letterSpacing: "-0.8px",
            lineHeight: 1.2,
          }}
        >
          Congratulations!
        </h1>

        <p style={{ fontSize: 16.5, color: "var(--color-muted)", marginBottom: 32, lineHeight: 1.6 }}>
          Your personalized <strong style={{ color: "var(--color-ink)" }}>{data.guideTitle}</strong> has been generated and tailored to your assessment.
        </p>

        {/* Guide Card Box */}
        <div
          style={{
            backgroundColor: "var(--color-surface-card)",
            border: "1px solid var(--color-hairline)",
            borderRadius: 20,
            padding: "32px 28px",
            marginBottom: 32,
            boxShadow: "0 16px 40px rgba(28, 26, 23, 0.06)",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "rgba(181, 105, 63, 0.12)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 500, color: "var(--color-ink)", margin: 0 }}>
                  {data.guideTitle}
                </h3>
                <span style={{ fontSize: 12.5, color: "var(--color-muted)" }}>
                  Verified Personal Document &middot; {formatName}
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-accent-sage)",
                backgroundColor: "rgba(122, 138, 111, 0.12)",
                padding: "4px 10px",
                borderRadius: 6,
              }}
            >
              100% Tailored
            </span>
          </div>

          {/* Primary Download Button */}
          <a
            href={`/download/${purchaseId}?token=${encodeURIComponent(token)}`}
            className="btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              color: "#fff",
              padding: "16px 28px",
              borderRadius: 12,
              textDecoration: "none",
              fontSize: 16,
              fontWeight: 500,
              boxShadow: "0 8px 24px rgba(181, 105, 63, 0.25)",
              marginBottom: 18,
            }}
          >
            <Download size={19} /> Download Your Guide ({formatName})
          </a>

          {/* Email receipt reminder */}
          {data.customerEmail && (
            <p
              style={{
                fontSize: 13,
                color: "var(--color-muted)",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
                justifyContent: "center",
              }}
            >
              <Mail size={14} /> Download link also dispatched to: <strong>{data.customerEmail}</strong>
            </p>
          )}
        </div>

        {/* Quick Start Guidance */}
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.4)",
            border: "1px solid var(--color-hairline)",
            borderRadius: 14,
            padding: "20px 24px",
            textAlign: "left",
            marginBottom: 36,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)", margin: "0 0 10px" }}>
            Recommended next steps:
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: 20,
              fontSize: 13.5,
              color: "var(--color-body)",
              lineHeight: 1.7,
            }}
          >
            <li>Save your PDF to your phone or desktop for offline access.</li>
            <li>Review the <strong>Week 1 baseline protocol</strong> before purchasing any new products.</li>
            <li>Bookmark this page to re-download your updated plan anytime.</li>
          </ul>
        </div>

        {/* Secondary Back Navigation */}
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            color: "var(--color-primary)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Explore More Body By Quinn Guides <ArrowRight size={14} />
        </a>
      </div>
    );
  }

  // Verification & Compiling in Progress (Loading State)
  const stage = Math.min(Math.floor(elapsed / SECONDS_PER_STAGE), STAGES.length - 1);
  const progress = Math.round(94 * (1 - Math.exp(-elapsed / 110)));
  const tip = WAIT_TIPS[Math.floor(elapsed / 9) % WAIT_TIPS.length];
  const title = data?.guideTitle;

  return (
    <div
      className="fade-up"
      style={{
        maxWidth: 560,
        margin: "0 auto",
        backgroundColor: "var(--color-surface-card)",
        border: "1px solid var(--color-hairline)",
        borderRadius: 24,
        padding: "44px 36px 36px",
        boxShadow: "0 16px 48px rgba(28, 26, 23, 0.05)",
        textAlign: "center",
      }}
    >
      <BuildingGuideArt />

      <h2 style={{ fontSize: "clamp(24px, 3.5vw, 30px)", fontWeight: 500, color: "var(--color-ink)", margin: "20px 0 10px", letterSpacing: "-0.5px" }}>
        {title ? <>Building your {title}</> : "Building your guide"}
      </h2>
      <p style={{ fontSize: 15, color: "var(--color-muted)", margin: "0 0 26px", lineHeight: 1.6 }}>
        Made just for you, not pulled from a template. This usually takes 2 to 4 minutes.
      </p>

      <div style={{ height: 8, backgroundColor: "var(--color-hairline)", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
        <div className="bar-fill" style={{ height: "100%", width: `${progress}%` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-muted)", marginBottom: 26 }}>
        <span>{STAGES[stage].label}...</span>
        <span>{progress}%</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left", backgroundColor: "rgba(255, 255, 255, 0.4)", padding: "20px 22px", borderRadius: 14, border: "1px solid var(--color-hairline)" }}>
        {STAGES.map((st, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <div key={st.label} style={{ display: "flex", alignItems: "flex-start", gap: 12, opacity: done || active ? 1 : 0.45, transition: "opacity 0.5s" }}>
              <span style={{ marginTop: 1 }}>
                {done ? <CheckCircle2 size={18} style={{ color: "var(--color-accent-sage, #5f8f5a)" }} />
                  : active ? <Loader2 size={18} className="spin" style={{ color: "var(--color-primary)" }} />
                  : <Clock size={18} style={{ color: "var(--color-muted)" }} />}
              </span>
              <span>
                <span style={{ display: "block", fontSize: 14, fontWeight: active ? 600 : 500, color: "var(--color-ink)" }}>{st.label}</span>
                {active && <span className="fade-up" style={{ display: "block", fontSize: 12.5, color: "var(--color-muted)", marginTop: 2 }}>{st.detail}</span>}
              </span>
            </div>
          );
        })}
      </div>

      <p key={tip} className="fade-up" style={{ fontSize: 13.5, color: "var(--color-body)", fontStyle: "italic", margin: "24px 0 0", lineHeight: 1.6, minHeight: 44 }}>
        {tip}
      </p>

      <p style={{ fontSize: 12.5, color: "var(--color-muted)", margin: "10px 0 0" }}>
        {data?.customerEmail
          ? <>You can close this tab. We will also email the download link to <strong>{data.customerEmail}</strong>.</>
          : "This page updates automatically as soon as your guide is ready."}
      </p>

      <style>{`
        .spin { animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .bar-fill { background: linear-gradient(90deg, var(--color-primary), var(--color-accent-amber), var(--color-primary)); background-size: 200% 100%; animation: barShimmer 2.4s linear infinite; transition: width 1s cubic-bezier(0.16, 1, 0.3, 1); border-radius: 4px; }
        @keyframes barShimmer { to { background-position: -200% 0; } }
        .art-line { stroke-dasharray: 100; stroke-dashoffset: 100; animation: drawLine 3.6s ease-in-out infinite; }
        .art-float { animation: floatY 3.2s ease-in-out infinite; }
        .art-spark { transform-origin: center; transform-box: fill-box; animation: twinkle 2.4s ease-in-out infinite; }
        @keyframes drawLine { 0% { stroke-dashoffset: 100; } 45%, 85% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -100; } }
        @keyframes floatY { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.6); } 50% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .spin, .bar-fill, .art-line, .art-float, .art-spark { animation: none; }
          .art-line { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

// A guide page "writing itself": lines draw in one after another, and sparkles
// twinkle around it.
function BuildingGuideArt() {
  const lines = [38, 52, 66, 80];
  return (
    <svg width="132" height="132" viewBox="0 0 132 132" fill="none" aria-hidden="true">
      <circle cx="66" cy="66" r="62" fill="rgba(181, 105, 63, 0.08)" />
      <g className="art-float">
        <rect x="34" y="20" width="64" height="86" rx="7" fill="#fff" stroke="var(--color-primary)" strokeWidth="2" />
        <rect x="42" y="28" width="26" height="6" rx="3" fill="var(--color-primary)" />
        {lines.map((y, i) => (
          <line key={y} className="art-line" pathLength="100" x1="42" x2={i % 2 ? 84 : 90} y1={y} y2={y}
            stroke="var(--color-hairline)" strokeWidth="3.5" strokeLinecap="round" style={{ animationDelay: `${i * 0.35}s` }} />
        ))}
        <rect x="42" y="94" width="8" height="6" rx="1" fill="var(--color-accent-amber)" />
        <rect x="54" y="88" width="8" height="12" rx="1" fill="var(--color-primary)" />
        <rect x="66" y="91" width="8" height="9" rx="1" fill="var(--color-accent-sage)" />
      </g>
      <path className="art-spark" d="M108 28l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4z" fill="var(--color-accent-amber)" />
      <path className="art-spark" style={{ animationDelay: "0.8s" }} d="M22 78l1.8 4.4 4.4 1.8-4.4 1.8L22 90.4l-1.8-4.4-4.4-1.8 4.4-1.8z" fill="var(--color-primary)" />
      <path className="art-spark" style={{ animationDelay: "1.5s" }} d="M104 96l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z" fill="var(--color-accent-sage)" />
    </svg>
  );
}
