export default function Hero() {
  return (
    <section
      className="hero-section"
      style={{
        backgroundColor: "var(--color-canvas)",
        paddingTop: 8,
        paddingBottom: 16,
        paddingLeft: 16,
        paddingRight: 16,
        overflow: "hidden",
      }}
    >
      <div
        className="hero-panel"
        style={{
          width: "100%",
          margin: "0 auto",
          borderRadius: 24,
          overflow: "hidden",
          position: "relative",
          background:
            "radial-gradient(circle at 12% 30%, rgba(181, 105, 63, 0.55) 0%, transparent 60%), radial-gradient(circle at 88% 15%, rgba(122, 138, 111, 0.35) 0%, transparent 55%), radial-gradient(circle at 50% 100%, rgba(217, 167, 99, 0.4) 0%, transparent 65%), #212121",
          boxShadow: "0 28px 80px rgba(28, 26, 23, 0.14)",
        }}
      >
        <div
          className="hero-grid"
          style={{
            margin: "0 auto",
            padding: "140px 72px 64px",
            maxWidth: 820,
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            className="fade-up"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
              padding: "6px 16px",
              borderRadius: 999,
              border: "1px solid rgba(247,244,239,0.25)",
              backgroundColor: "rgba(247,244,239,0.08)",
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: "0.5px",
              color: "var(--color-accent-amber)",
            }}
          >
            Personalized &middot; Not Generic
          </div>

          <h1
            className="fade-up"
            style={{
              fontSize: "clamp(36px, 5.5vw, 62px)",
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: "-1.2px",
              color: "var(--color-on-dark)",
              marginBottom: 20,
              animationDelay: "80ms",
            }}
          >
            A plan built around <span style={{ color: "#f0c896" }}>your life</span>, not a template
          </h1>

          <p
            className="fade-up"
            style={{
              fontSize: 17,
              lineHeight: 1.65,
              color: "rgba(247,244,239,0.82)",
              marginBottom: 32,
              maxWidth: 560,
              marginLeft: "auto",
              marginRight: "auto",
              animationDelay: "160ms",
            }}
          >
            Answer a few questions about your home, your goals, or your routine. Get a personalized step-by-step
            guide - delivered as a PDF you can start using today.
          </p>

          <div
            className="fade-up"
            style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", animationDelay: "240ms" }}
          >
            <a
              href="#categories"
              className="btn-primary"
              style={{
                color: "#fff",
                fontSize: 14.5,
                fontWeight: 500,
                padding: "14px 28px",
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              Choose Your Category
            </a>
            <a
              href="#how-it-works"
              style={{
                backgroundColor: "rgba(247,244,239,0.1)",
                color: "var(--color-on-dark)",
                fontSize: 14.5,
                fontWeight: 500,
                padding: "14px 28px",
                borderRadius: 10,
                border: "1px solid rgba(247,244,239,0.25)",
                textDecoration: "none",
              }}
            >
              See How It Works
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .hero-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px);
          background-size: 40px 40px, 40px 40px;
          mix-blend-mode: overlay;
          opacity: 0.5;
          pointer-events: none;
        }
        @media (max-width: 768px) {
          .hero-section { padding: 6px 12px 12px !important; }
          .hero-panel { border-radius: 20px !important; }
          .hero-grid { padding: 104px 24px 40px !important; }
        }
      `}</style>
    </section>
  );
}
