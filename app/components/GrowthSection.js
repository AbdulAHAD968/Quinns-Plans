import { TreeCanvas } from "./TreeCanvas";

export default function GrowthSection() {
  return (
    <section style={{ backgroundColor: "var(--color-surface-dark)", padding: "96px 0" }}>
      <div
        className="growth-grid"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 24px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 48,
          alignItems: "center",
        }}
      >
        <div className="growth-copy">
          <span
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "1.8px",
              textTransform: "uppercase",
              color: "var(--color-accent-amber)",
              marginBottom: 14,
            }}
          >
            Built to compound
          </span>
          <h2
            style={{
              fontSize: "clamp(28px, 3.5vw, 42px)",
              letterSpacing: "-0.8px",
              color: "var(--color-on-dark)",
              lineHeight: 1.15,
              marginBottom: 20,
            }}
          >
            Small steps, followed consistently, grow into something real
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: "rgba(247,244,239,0.75)", marginBottom: 16, maxWidth: 480 }}>
            Your guide isn't a one-time checklist — it's a structure you keep coming back to. Each step builds on
            the last, the same way a single root becomes a branch, then a canopy, then fruit.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: "rgba(247,244,239,0.75)", maxWidth: 480 }}>
            That's the difference between a generic template and a plan that's actually yours: it's built to grow
            with you, not just hand you a list and walk away.
          </p>
        </div>

        <div className="growth-visual" aria-hidden="true">
          <TreeCanvas />
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .growth-grid { grid-template-columns: 1fr !important; }
          .growth-visual { order: -1; }
        }
      `}</style>
    </section>
  );
}
