import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import GuideCategory from "@/models/GuideCategory";
import Guide from "@/models/Guide";
import GuideCard from "@/app/components/GuideCard";

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  await connectDB();

  const category = await GuideCategory.findOne({ slug, isActive: true }).lean();
  if (!category) notFound();

  const guides = await Guide.find({ categoryId: category._id, status: "published", isActive: true }).lean();

  return (
    <section style={{ padding: "140px 24px 96px", backgroundColor: "var(--color-canvas)", minHeight: "60vh" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
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
          Category
        </span>
        <h1 style={{ fontSize: "clamp(30px, 4vw, 46px)", letterSpacing: "-0.8px", color: "var(--color-ink)", marginBottom: 16 }}>
          {category.name}
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--color-muted)", maxWidth: 560, marginBottom: 56 }}>
          {category.description || "Browse the personalized guides available in this category."}
        </p>

        {guides.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>No guides published in this category yet. Check back soon.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {guides.map((g) => (
              <GuideCard key={String(g._id)} guide={g} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
