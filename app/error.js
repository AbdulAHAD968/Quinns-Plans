"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error("Unhandled page error captured by ErrorBoundary:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px 24px 80px",
        backgroundColor: "var(--color-canvas)",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          backgroundColor: "var(--color-surface-card)",
          border: "1px solid var(--color-hairline)",
          borderRadius: 20,
          padding: "44px 36px",
          textAlign: "center",
          boxShadow: "0 12px 36px rgba(28, 26, 23, 0.05)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: "color-mix(in srgb, var(--color-error, #b84a3d) 12%, transparent)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-error, #b84a3d)",
            marginBottom: 20,
          }}
        >
          <AlertCircle size={28} />
        </div>

        <h1
          style={{
            fontSize: "clamp(24px, 3vw, 32px)",
            fontWeight: 500,
            color: "var(--color-ink)",
            marginBottom: 12,
            letterSpacing: "-0.5px",
          }}
        >
          Something Went Wrong
        </h1>

        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--color-muted)",
            marginBottom: 32,
          }}
        >
          We couldn't load this page properly. This could be a temporary connection hiccup or a service update.
        </p>

        {process.env.NODE_ENV !== "production" && error?.message && (
          <details
            style={{
              textAlign: "left",
              backgroundColor: "rgba(0,0,0,0.04)",
              padding: "12px 16px",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "monospace",
              color: "var(--color-ink)",
              marginBottom: 28,
              wordBreak: "break-word",
            }}
          >
            <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--color-primary)" }}>
              Technical Details (Dev Mode)
            </summary>
            <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{error.message}</p>
          </details>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => reset()}
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              padding: "12px 24px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={16} /> Try Again
          </button>

          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "transparent",
              color: "var(--color-body)",
              fontSize: 14,
              fontWeight: 500,
              padding: "12px 20px",
              borderRadius: 10,
              border: "1px solid var(--color-hairline)",
              textDecoration: "none",
            }}
          >
            <Home size={16} /> Home
          </a>
        </div>
      </div>
    </div>
  );
}
