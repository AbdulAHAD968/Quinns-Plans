import SuccessStatus from "@/app/components/SuccessStatus";

export default async function SuccessPage({ searchParams }) {
  const { purchase_id, token } = await searchParams;

  return (
    <section style={{ padding: "140px 24px 120px", backgroundColor: "var(--color-canvas)", minHeight: "75vh" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <SuccessStatus purchaseId={purchase_id} token={token} />
      </div>
    </section>
  );
}
