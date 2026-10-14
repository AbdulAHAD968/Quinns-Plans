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

const COMPILING_MESSAGES = [
  "Confirming your payment and security tokens...",
  "Analyzing your questionnaire responses...",
  "Curating product recommendations & active ingredients...",
  "Formatting your daily routine & week-by-week schedule...",
  "Finalizing your personalized PDF document...",
];

export default function SuccessStatus({ purchaseId, token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [compilingStep, setCompilingStep] = useState(0);
  const [progressWidth, setProgressWidth] = useState(25);
  const intervalRef = useRef(null);

  // Cycle reassuring status messages while compiling
  useEffect(() => {
    if (data?.downloadReady) return;
    const msgTimer = setInterval(() => {
      setCompilingStep((prev) => (prev + 1) % COMPILING_MESSAGES.length);
      setProgressWidth((prev) => Math.min(prev + 18, 92));
    }, 3500);
    return () => clearInterval(msgTimer);
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
          setProgressWidth(100);
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
  return (
    <div
      className="fade-up"
      style={{
        maxWidth: 540,
        margin: "0 auto",
        backgroundColor: "var(--color-surface-card)",
        border: "1px solid var(--color-hairline)",
        borderRadius: 24,
        padding: "48px 36px",
        boxShadow: "0 16px 48px rgba(28, 26, 23, 0.05)",
        textAlign: "center",
      }}
    >
      {/* Animated Spinner Icon with Brand Accent */}
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: "50%",
          backgroundColor: "rgba(181, 105, 63, 0.12)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-primary)",
          marginBottom: 24,
          position: "relative",
        }}
      >
        <Loader2 size={34} className="spin" />
      </div>

      <h2
        style={{
          fontSize: "clamp(24px, 3.5vw, 30px)",
          fontWeight: 500,
          color: "var(--color-ink)",
          marginBottom: 12,
          letterSpacing: "-0.5px",
        }}
      >
        Preparing Your Custom Guide
      </h2>

      <p style={{ fontSize: 15, color: "var(--color-muted)", marginBottom: 28, lineHeight: 1.6 }}>
        {COMPILING_MESSAGES[compilingStep]}
      </p>

      {/* Dynamic Progress Indicator */}
      <div
        style={{
          height: 6,
          backgroundColor: "var(--color-hairline)",
          borderRadius: 3,
          overflow: "hidden",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressWidth}%`,
            backgroundColor: "var(--color-primary)",
            transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>

      {/* Step checklist verification */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          textAlign: "left",
          backgroundColor: "rgba(255, 255, 255, 0.4)",
          padding: "18px 20px",
          borderRadius: 14,
          border: "1px solid var(--color-hairline)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--color-ink)" }}>
          <CheckCircle2 size={17} style={{ color: "var(--color-accent-sage, #5f8f5a)" }} />
          <span>Payment securely confirmed via Stripe</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--color-ink)" }}>
          <Loader2 size={17} className="spin" style={{ color: "var(--color-primary)" }} />
          <span>Generating tailored plan & schedule</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--color-muted)" }}>
          <Clock size={17} />
          <span>Generating PDF download link</span>
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: "var(--color-muted)", marginTop: 24, margin: "24px 0 0" }}>
        This page will update automatically once compilation is complete.
      </p>

      <style>{`
        .spin { animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
