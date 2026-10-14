import SuccessStatus from "@/app/components/SuccessStatus";

export default async function SuccessPage({ searchParams }) {
  const { purchase_id } = await searchParams;

  return (
    <section style={{ padding: "160px 24px 120px", backgroundColor: "var(--color-canvas)", minHeight: "70vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <SuccessStatus purchaseId={purchase_id} />
      </div>
    </section>
  );
}
