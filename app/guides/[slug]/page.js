import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Guide from "@/models/Guide";
import GuideCategory from "@/models/GuideCategory"; // required by Guide.populate("categoryId") below
import PlanTemplate from "@/models/PlanTemplate";
import { CheckCircle2 } from "lucide-react";

void GuideCategory;

export default async function GuidePage({ params }) {
  const { slug } = await params;
  await connectDB();

  const guide = await Guide.findOne({ slug, status: "published", isActive: true }).populate("categoryId", "name slug").lean();
  if (!guide) notFound();

  const template = guide.templateId ? await PlanTemplate.findById(guide.templateId).lean() : null;

  const categorySlug = guide.categoryId?.slug;
  const categoryName = guide.categoryId?.name || "All Guides";
  const categoryHref = categorySlug ? `/categories/${categorySlug}` : "/";

  return (
    <section style={{ padding: "140px 24px 96px", backgroundColor: "var(--color-canvas)", minHeight: "60vh" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <a href={categoryHref} style={{ fontSize: 13, color: "var(--color-primary)", textDecoration: "none", fontWeight: 500 }}>
          &larr; {categoryName}
        </a>

        <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.8px", color: "var(--color-ink)", marginTop: 16, marginBottom: 16 }}>
          {guide.title}
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--color-muted)", maxWidth: 560, marginBottom: 32 }}>
          {guide.description}
        </p>

        <div
          style={{
            backgroundColor: "var(--color-surface-card)",
            border: "1px solid var(--color-hairline)",
            borderRadius: 16,
            padding: 32,
            marginBottom: 32,
          }}
        >
          {template?.objectives?.length > 0 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 16 }}>
                What this guide covers
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 12 }}>
                {template.objectives.map((o, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 15, color: "var(--color-body)" }}>
                    <CheckCircle2 size={18} style={{ color: "var(--color-accent-sage)", flexShrink: 0, marginTop: 1 }} />
                    {o}
                  </li>
                ))}
              </ul>
            </>
          )}

          {template?.durationOptions?.length > 0 && (
            <p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 20 }}>
              Available durations: {template.durationOptions.join(", ")}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <span style={{ fontSize: 28, fontWeight: 600, color: "var(--color-ink)" }}>
                ${(guide.priceCents / 100).toFixed(2)}
              </span>
              <span style={{ fontSize: 13, color: "var(--color-muted)", marginLeft: 8 }}>
                one-time &middot; {guide.formats.toUpperCase()}
              </span>
            </div>
            <a
              href={`/guides/${guide.slug}/assessment`}
              className="btn-primary"
              style={{ color: "#fff", fontSize: 15, fontWeight: 500, padding: "14px 32px", borderRadius: 10, textDecoration: "none" }}
            >
              Start Your Personalized Guide
            </a>
          </div>
        </div>

        <p style={{ fontSize: 13, color: "var(--color-muted)" }}>
          You'll answer a short assessment, preview your guide's structure, then pay securely before downloading.
        </p>
      </div>
    </section>
  );
}
