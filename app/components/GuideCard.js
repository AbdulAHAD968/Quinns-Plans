import { ArrowRight } from "lucide-react";

export default function GuideCard({ guide }) {
  return (
    <a
      href={`/guides/${guide.slug}`}
      className="hover-card"
      style={{
        display: "block",
        backgroundColor: "var(--color-surface-card)",
        border: "1px solid var(--color-hairline)",
        borderRadius: 16,
        padding: "26px 24px",
        textDecoration: "none",
      }}
    >
      <h3 style={{ fontSize: 19, fontWeight: 500, color: "var(--color-ink)", marginBottom: 10, letterSpacing: "-0.2px" }}>
        {guide.title}
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--color-muted)", marginBottom: 20, minHeight: 42 }}>
        {guide.description || "A personalized, step-by-step guide built from your answers."}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: "var(--color-ink)" }}>
          ${(guide.priceCents / 100).toFixed(2)}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--color-primary)" }}>
          Start <ArrowRight size={14} />
        </span>
      </div>
    </a>
  );
}
