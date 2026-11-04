// Downloads an approved product photo for embedding in a PDF. Only https URLs on
// known image hosts are fetched, with a size cap and timeout, so a catalog entry
// can never make the server request an arbitrary address.
const IMAGE_HOSTS = ["res.cloudinary.com", "m.media-amazon.com", "images-na.ssl-images-amazon.com", "images-eu.ssl-images-amazon.com"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function fetchApprovedImage(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !IMAGE_HOSTS.includes(u.hostname.toLowerCase())) return null;
    const res = await fetch(u, { signal: AbortSignal.timeout(10000), redirect: "error" });
    if (!res.ok) return null;
    if (!/^image\/(jpeg|png|webp)/i.test(res.headers.get("content-type") || "")) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) return null;
    return bytes;
  } catch {
    return null;
  }
}
