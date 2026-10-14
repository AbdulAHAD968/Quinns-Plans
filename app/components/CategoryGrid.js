import { connectDB } from "@/lib/db";
import GuideCategory from "@/models/GuideCategory";
import Guide from "@/models/Guide";
import CategoryCard from "./CategoryCard";

export default async function CategoryGrid() {
  await connectDB();
  const categories = await GuideCategory.find({ isActive: true }).sort({ order: 1 }).lean();
  const guides = await Guide.find({ status: "published", isActive: true }).lean();

  const guidesByCategory = {};
  for (const g of guides) {
    const key = String(g.categoryId);
    guidesByCategory[key] = (guidesByCategory[key] || 0) + 1;
  }

  return (
    <section id="categories" style={{ backgroundColor: "var(--color-canvas)", padding: "96px 0" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
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
            Choose a category
          </span>
          <h2
            style={{
              fontSize: "clamp(28px, 3.5vw, 42px)",
              letterSpacing: "-0.8px",
              color: "var(--color-ink)",
              lineHeight: 1.15,
            }}
          >
            What are you working on?
          </h2>
        </div>

        {categories.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--color-muted)" }}>Categories coming soon.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {categories.map((c) => (
              <CategoryCard key={String(c._id)} category={c} guideCount={guidesByCategory[String(c._id)] || 0} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
