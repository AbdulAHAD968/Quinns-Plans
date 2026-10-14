"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: "#f7f4ef",
          color: "#1c1a17",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            backgroundColor: "#efe5db",
            border: "1px solid #e3dbcd",
            borderRadius: 16,
            padding: 36,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              backgroundColor: "rgba(184, 74, 61, 0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#b84a3d",
              marginBottom: 16,
            }}
          >
            <AlertCircle size={26} />
          </div>
          <h2 style={{ fontSize: 24, margin: "0 0 10px", fontWeight: 600 }}>Application Error</h2>
          <p style={{ fontSize: 14, color: "#726c62", margin: "0 0 24px", lineHeight: 1.6 }}>
            A critical error occurred while loading Body By Quinn Plans. Please try refreshing the application.
          </p>
          <button
            onClick={() => reset()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#b5693f",
              color: "#ffffff",
              border: "none",
              padding: "12px 24px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={15} /> Reload
          </button>
        </div>
      </body>
    </html>
  );
}
