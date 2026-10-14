"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const ITEMS = [
  { q: "What exactly do I get?", a: "A personalized PDF guide (or DOCX, depending on the guide) built from your specific answers — not a generic template everyone receives." },
  { q: "How personalized is it really?", a: "Your answers drive the structure, scope, and recommendations in the guide. Two people with different situations get meaningfully different guides." },
  { q: "When do I get charged?", a: "Only after you preview the guide's structure and confirm you want it. Payment is processed securely through Stripe." },
  { q: "What if I'm not happy with it?", a: "Reach out to us and we'll make it right. We want you using the guide, not just buying it." },
  { q: "Can I download it again later?", a: "Yes — your download link stays available, and your purchase confirmation email includes it as well." },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" style={{ backgroundColor: "var(--color-surface-card)", padding: "96px 0" }}>
      <div
        style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 64 }}
        className="faq-grid"
      >
        <div>
          <span
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "1.8px",
              textTransform: "uppercase",
              color: "var(--color-primary)",
              marginBottom: 16,
            }}
          >
            Questions
          </span>
          <h2 style={{ fontSize: "clamp(26px, 3.2vw, 38px)", letterSpacing: "-0.6px", color: "var(--color-ink)", lineHeight: 1.15 }}>
            Everything you need to know
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {ITEMS.map((item, i) => (
            <FAQItem key={i} item={item} isOpen={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? -1 : i)} />
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .faq-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </section>
  );
}

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div style={{ borderBottom: "1px solid var(--color-hairline)" }}>
      <button
        className="faq-button"
        onClick={onToggle}
        style={{
          width: "100%",
          textAlign: "left",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "22px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          color: isOpen ? "var(--color-primary)" : "var(--color-ink)",
        }}
      >
        <span style={{ fontSize: 15.5, fontWeight: 500 }}>{item.q}</span>
        <div
          className="faq-icon"
          style={{
            width: 22,
            height: 22,
            flexShrink: 0,
            color: isOpen ? "var(--color-primary)" : "var(--color-muted-soft)",
            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
            transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <Plus size={20} strokeWidth={1.5} />
        </div>
      </button>
      <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ overflow: "hidden" }}>
          <p style={{ paddingBottom: 22, fontSize: 14.5, lineHeight: 1.7, color: "var(--color-body)" }}>{item.a}</p>
        </div>
      </div>
    </div>
  );
}
