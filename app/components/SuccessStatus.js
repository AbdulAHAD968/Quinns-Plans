"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, AlertTriangle, Download } from "lucide-react";

export default function SuccessStatus({ purchaseId, token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!purchaseId || !token) { setError("Missing purchase reference."); return; }

    async function poll() {
      try {
        const res = await fetch(`/api/purchases/${purchaseId}?token=${encodeURIComponent(token)}`);
        if (!res.ok) { setError("We couldn't find that purchase."); return; }
        const json = await res.json();
        setData(json);
        if (json.downloadReady || json.generationStatus === "failed" || json.status === "failed") {
          clearInterval(intervalRef.current);
        }
      } catch {
        // transient network error during polling; keep retrying silently
      }
    }

    poll();
    intervalRef.current = setInterval(poll, 3000);
    return () => clearInterval(intervalRef.current);
  }, [purchaseId, token]);

  if (error) {
    return (
      <>
        <AlertTriangle size={40} style={{ color: "var(--color-error)", marginBottom: 16 }} />
        <h1 style={{ fontSize: 24, color: "var(--color-ink)", marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: "var(--color-muted)", fontSize: 15 }}>{error}</p>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Loader2 size={32} className="spin" style={{ color: "var(--color-primary)", marginBottom: 16 }} />
        <p style={{ color: "var(--color-muted)", fontSize: 15 }}>Confirming your payment...</p>
        <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </>
    );
  }

  if (data.status === "failed" || data.generationStatus === "failed") {
    return (
      <>
        <AlertTriangle size={40} style={{ color: "var(--color-error)", marginBottom: 16 }} />
        <h1 style={{ fontSize: 24, color: "var(--color-ink)", marginBottom: 8 }}>
          {data.status === "failed" ? "Payment didn't go through" : "We hit a snag generating your guide"}
        </h1>
        <p style={{ color: "var(--color-muted)", fontSize: 15 }}>
          {data.generationError || "Please contact support and we'll sort it out right away."}
        </p>
      </>
    );
  }

  if (data.downloadReady) {
    return (
      <>
        <CheckCircle2 size={40} style={{ color: "var(--color-success)", marginBottom: 16 }} />
        <h1 style={{ fontSize: 26, color: "var(--color-ink)", marginBottom: 10 }}>Your guide is ready</h1>
        <p style={{ color: "var(--color-muted)", fontSize: 15, marginBottom: 28 }}>{data.guideTitle}</p>
        <a
          href={`/download/${purchaseId}?token=${encodeURIComponent(token)}`}
          className="btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#fff", padding: "14px 32px", borderRadius: 10, textDecoration: "none", fontSize: 15, fontWeight: 500 }}
        >
          <Download size={16} /> Download Your Guide
        </a>
      </>
    );
  }

  return (
    <>
      <Loader2 size={32} className="spin" style={{ color: "var(--color-primary)", marginBottom: 16 }} />
      <h1 style={{ fontSize: 24, color: "var(--color-ink)", marginBottom: 8 }}>Payment confirmed</h1>
      <p style={{ color: "var(--color-muted)", fontSize: 15 }}>
        We're generating your personalized guide now. This usually takes a minute — this page updates automatically.
      </p>
      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
