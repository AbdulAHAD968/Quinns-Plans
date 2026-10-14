import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "140px 24px 96px",
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
            backgroundColor: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-primary)",
            marginBottom: 20,
          }}
        >
          <Compass size={28} />
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
          Guide Not Found
        </h1>

        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--color-muted)",
            marginBottom: 32,
          }}
        >
          The guide or category you're looking for doesn't exist, has been archived, or may have been moved.
        </p>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <a
            href="/"
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              padding: "12px 28px",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            <Home size={16} /> Explore Available Guides
          </a>
        </div>
      </div>
    </div>
  );
}
