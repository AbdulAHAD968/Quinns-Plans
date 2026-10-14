import { CandleCanvas } from "./CandleCanvas";

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
          background: "#212121",
          boxShadow: "0 28px 80px rgba(28, 26, 23, 0.14)",
        }}
      >
        <div className="hero-side hero-side--right hero-side--candle" aria-hidden="true">
          <CandleCanvas />
        </div>

        <div
          className="hero-grid"
          style={{
            margin: "0 auto",
            padding: "140px 72px 64px",
            maxWidth: 820,
            textAlign: "center",
            position: "relative",
            zIndex: 2,
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
              backgroundColor: "rgba(33,33,33,0.55)",
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
              textShadow: "0 2px 24px rgba(0,0,0,0.4)",
            }}
          >
            A plan built around <span style={{ color: "#f0c896" }}>your life</span>, not a template
          </h1>

          <p
            className="fade-up"
            style={{
              fontSize: 17,
              lineHeight: 1.65,
              color: "rgba(247,244,239,0.85)",
              marginBottom: 32,
              maxWidth: 560,
              marginLeft: "auto",
              marginRight: "auto",
              textShadow: "0 1px 12px rgba(0,0,0,0.5)",
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
                backgroundColor: "rgba(33,33,33,0.55)",
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
        .hero-panel {
          min-height: calc(100vh - 32px);
          display: flex;
          align-items: center;
        }
        .hero-panel::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 70% at 50% 45%, rgba(33,33,33,0.82) 0%, rgba(33,33,33,0.45) 55%, transparent 80%);
          z-index: 1;
          pointer-events: none;
        }
        .hero-grid { width: 100%; }
        .hero-side {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 34%;
          z-index: 0;
          opacity: 0.85;
        }
        .hero-side--right {
          right: -6%;
        }
        .hero-side--candle {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hero-side--candle > div {
          position: relative !important;
          width: 70% !important;
          height: 70% !important;
        }
        @media (max-width: 900px) {
          .hero-side { display: none !important; }
        }
        @media (max-width: 768px) {
          .hero-section { padding: 6px 12px 12px !important; }
          .hero-panel { border-radius: 20px !important; min-height: calc(100vh - 12px); }
          .hero-grid { padding: 104px 24px 40px !important; }
        }
      `}</style>
    </section>
  );
}
