import { Suspense } from "react";
import Hero from "./components/Hero";
import CategoryGrid from "./components/CategoryGrid";
import Process from "./components/Process";
import FAQ from "./components/FAQ";

function CategoryGridSkeleton() {
  return (
    <section style={{ backgroundColor: "var(--color-canvas)", padding: "96px 0" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
        <p style={{ color: "var(--color-muted)" }}>Loading categories...</p>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Suspense fallback={<CategoryGridSkeleton />}>
        <CategoryGrid />
      </Suspense>
      <Process />
      <FAQ />
    </>
  );
}
