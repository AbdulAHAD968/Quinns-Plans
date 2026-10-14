import { CandleAnimation } from "./CandleAnimation";

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
          <CandleAnimation scale={1.35} />
        </div>

        <div className="hero-grid">
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
              fontSize: "clamp(32px, 5.5vw, 62px)",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-1.2px",
              color: "var(--color-on-dark)",
              marginBottom: 20,
              maxWidth: 650,
              animationDelay: "80ms",
              textShadow: "0 2px 24px rgba(0,0,0,0.4)",
            }}
          >
            A plan built around <span style={{ color: "#f0c896" }}>your life</span>, not a template
          </h1>

          <p
            className="fade-up"
            style={{
              fontSize: 16.5,
              lineHeight: 1.65,
              color: "rgba(247,244,239,0.85)",
              marginBottom: 32,
              maxWidth: 560,
              textShadow: "0 1px 12px rgba(0,0,0,0.5)",
            }}
          >
            Answer a few questions about your home, your goals, or your routine. Get a personalized step-by-step
            guide - delivered as a PDF you can start using today.
          </p>

          <div
            className="fade-up hero-buttons"
            style={{ display: "flex", gap: 12, justifyContent: "flex-start", flexWrap: "wrap", animationDelay: "240ms" }}
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

          <div className="fade-up hero-candle-mobile" aria-hidden="true" style={{ animationDelay: "320ms" }}>
            <CandleAnimation scale={1.05} />
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
          background: linear-gradient(90deg, rgba(33,33,33,0.98) 0%, rgba(33,33,33,0.9) 42%, rgba(33,33,33,0.28) 72%, rgba(33,33,33,0.06) 100%);
          z-index: 1;
          pointer-events: none;
        }
        .hero-grid {
          position: relative;
          z-index: 2;
          width: 58%;
          max-width: 760px;
          margin: 0 auto 0 0;
          padding: 140px 7vw 64px;
          text-align: left;
        }
        .hero-side {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 44%;
          z-index: 2;
          pointer-events: none;
          opacity: 1;
        }
        .hero-side--right {
          right: 2%;
        }
        .hero-side--candle {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hero-candle-mobile {
          display: none;
        }
        @media (max-width: 900px) {
          .hero-panel::after {
            background: rgba(33,33,33,0.95) !important;
          }
          .hero-side {
            display: none !important;
          }
          .hero-candle-mobile {
            display: flex !important;
            justify-content: center;
            align-items: center;
            margin-top: 36px;
            width: 100%;
            height: 220px;
          }
          .hero-grid {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 110px 24px 60px !important;
            text-align: center !important;
          }
          .hero-grid p {
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .hero-buttons {
            justify-content: center !important;
          }
        }
        @media (max-width: 600px) {
          .hero-section {
            padding: 6px 10px 12px !important;
          }
          .hero-panel {
            border-radius: 20px !important;
            min-height: calc(100vh - 12px);
          }
          .hero-grid {
            padding: 96px 18px 48px !important;
          }
          .hero-buttons {
            flex-direction: column !important;
            width: 100% !important;
          }
          .hero-buttons a {
            width: 100% !important;
            text-align: center !important;
          }
        }
      `}</style>
    </section>
  );
}
