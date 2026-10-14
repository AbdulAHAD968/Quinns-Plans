import { ArrowRight } from "lucide-react";

export default function CategoryCard({ category, guideCount }) {
  return (
    <a
      href={`/categories/${category.slug}`}
      className="hover-card"
      style={{
        display: "block",
        backgroundColor: "var(--color-surface-card)",
        border: "1px solid var(--color-hairline)",
        borderRadius: 16,
        padding: "28px 24px",
        textDecoration: "none",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: "var(--color-ink)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          fontSize: 18,
          color: "var(--color-accent-amber)",
          fontFamily: "var(--font-display)",
        }}
      >
        {category.name.charAt(0)}
      </div>
      <h3
        style={{
          fontSize: 20,
          fontWeight: 500,
          color: "var(--color-ink)",
          marginBottom: 8,
          letterSpacing: "-0.3px",
        }}
      >
        {category.name}
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--color-muted)", marginBottom: 18, minHeight: 42 }}>
        {category.description || "Personalized guides tailored to your situation."}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--color-primary)",
        }}
      >
        <span>{guideCount} guide{guideCount === 1 ? "" : "s"} available</span>
        <ArrowRight size={16} />
      </div>
    </a>
  );
}
