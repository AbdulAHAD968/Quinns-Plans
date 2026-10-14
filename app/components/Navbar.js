"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/#categories", label: "Categories" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#faq", label: "FAQ" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 16,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <nav
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 0,
            backgroundColor: scrolled ? "var(--color-surface-dark)" : "var(--color-canvas)",
            border: scrolled ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid var(--color-hairline)",
            borderRadius: 14,
            boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.24)" : "0 2px 16px rgba(0,0,0,0.08)",
            padding: "8px 10px 8px 18px",
            transition: "all 0.3s ease",
            whiteSpace: "nowrap",
          }}
        >
          <a
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              textDecoration: "none",
              marginRight: 24,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <Image src="/logo.png" alt="Body By Quinn" fill style={{ objectFit: "cover" }} />
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fontWeight: 500,
                color: scrolled ? "var(--color-on-dark)" : "var(--color-ink)",
                letterSpacing: "-0.2px",
                transition: "color 0.2s ease",
              }}
            >
              Body By Quinn
            </span>
          </a>

          <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                style={{
                  padding: "7px 13px",
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: scrolled ? "var(--color-on-dark-soft)" : "var(--color-muted)",
                  textDecoration: "none",
                  borderRadius: 8,
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
                className={`nav-link-item ${scrolled ? "nav-link-item--scrolled" : ""}`}
              >
                {l.label}
              </a>
            ))}
          </div>

          <a
            href="/#categories"
            className="btn-primary nav-cta-btn"
            style={{
              marginLeft: 16,
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 500,
              padding: "8px 18px",
              borderRadius: 8,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Get Your Guide
          </a>

          <button
            className="hamburger"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            style={{
              background: "none",
              border: scrolled ? "1px solid rgba(255,255,255,0.18)" : "1px solid var(--color-hairline)",
              borderRadius: 8,
              padding: 7,
              marginLeft: 10,
              cursor: "pointer",
              color: scrolled ? "var(--color-on-dark)" : "var(--color-ink)",
              display: "none",
              alignItems: "center",
            }}
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </nav>
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            top: 72,
            left: 16,
            right: 16,
            zIndex: 49,
            backgroundColor: "var(--color-canvas)",
            border: "1px solid var(--color-hairline)",
            borderRadius: 12,
            padding: "12px 16px 16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}
        >
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "11px 8px",
                fontSize: 15,
                fontWeight: 500,
                color: "var(--color-ink)",
                textDecoration: "none",
                borderBottom: "1px solid var(--color-hairline-soft)",
              }}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}

      <style>{`
        .nav-link-item:hover {
          color: var(--color-primary) !important;
          background-color: rgba(181, 105, 63, 0.08);
        }
        .nav-link-item--scrolled:hover {
          color: #ffffff !important;
          background-color: rgba(255, 255, 255, 0.12) !important;
        }
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .hamburger { display: flex !important; }
        }
        @media (max-width: 520px) {
          .nav-cta-btn { display: none !important; }
        }
      `}</style>
    </>
  );
}
