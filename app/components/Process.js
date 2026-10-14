const STEPS = [
  { num: "01", title: "Pick a category", desc: "Home organization, fitness, beauty, kitchen, work, or travel — choose what you want to improve." },
  { num: "02", title: "Answer a few questions", desc: "Tell us about your space, goals, time, and budget. It takes about 3 minutes." },
  { num: "03", title: "Preview your plan", desc: "See the guide's structure and what's included before you pay anything." },
  { num: "04", title: "Get your guide", desc: "Pay securely, then download your personalized PDF guide instantly." },
];

export default function Process() {
  return (
    <section id="how-it-works" style={{ backgroundColor: "var(--color-surface-soft)", padding: "96px 0" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <span
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "1.8px",
              textTransform: "uppercase",
              color: "var(--color-primary)",
              marginBottom: 14,
            }}
          >
            How it works
          </span>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", letterSpacing: "-0.8px", color: "var(--color-ink)" }}>
            From answers to a finished guide
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 0,
          }}
          className="process-grid"
        >
          {STEPS.map((s, i) => (
            <div
              key={s.num}
              style={{
                padding: "0 24px",
                borderLeft: i === 0 ? "none" : "1px solid var(--color-hairline)",
              }}
              className="process-step"
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  color: "var(--color-primary)",
                  marginBottom: 16,
                  fontWeight: 500,
                }}
              >
                {s.num}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 500, color: "var(--color-ink)", marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--color-muted)" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .process-step { border-left: none !important; border-top: 1px solid var(--color-hairline); padding: 24px 0 0 !important; }
        }
      `}</style>
    </section>
  );
}
