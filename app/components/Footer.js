import Image from "next/image";

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "var(--color-surface-dark)",
        padding: "64px 0 32px",
        borderTop: "1px solid rgba(247,244,239,0.06)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 32,
            paddingBottom: 40,
            borderBottom: "1px solid rgba(247,244,239,0.08)",
          }}
        >
          <div style={{ maxWidth: 320 }}>
            <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, textDecoration: "none" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, overflow: "hidden", position: "relative" }}>
                <Image src="/logo.png" alt="Body By Quinn" fill style={{ objectFit: "cover" }} />
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--color-on-dark)" }}>
                Body By Quinn
              </span>
            </a>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--color-on-dark-soft)" }}>
              Personalized guides built around your real life - not a generic template. Pick a category, answer a few questions, get your plan.
            </p>
          </div>

          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--color-muted-soft)", marginBottom: 14 }}>
                Explore
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                <li><a href="/#categories" className="footer-link">Categories</a></li>
                <li><a href="/#how-it-works" className="footer-link">How It Works</a></li>
                <li><a href="/#faq" className="footer-link">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--color-muted-soft)", marginBottom: 14 }}>
                Main Site
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                <li><a href="https://www.bodybyquinn.com" className="footer-link">bodybyquinn.com</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 13, color: "var(--color-on-dark-soft)" }}>
            &copy; {CURRENT_YEAR} Body By Quinn. All rights reserved.
          </p>
        </div>
      </div>

      <style>{`
        .footer-link { font-size: 14px; color: var(--color-on-dark-soft); text-decoration: none; transition: color 0.15s; }
        .footer-link:hover { color: var(--color-on-dark); }
      `}</style>
    </footer>
  );
}
