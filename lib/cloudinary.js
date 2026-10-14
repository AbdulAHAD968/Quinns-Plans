import crypto from "crypto";

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const folder = (process.env.CLOUDINARY_UPLOAD_FOLDER || "body-by-quinn/guides").trim().replace(/^\/+|\/+$/g, "");

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables are not configured.");
  }
  return { cloudName, apiKey, apiSecret, folder };
}

function signUpload({ folder, timestamp, apiSecret, publicId }) {
  const parts = [`folder=${folder}`, `public_id=${publicId}`, `timestamp=${timestamp}`];
  const toSign = parts.join("&") + apiSecret;
  return crypto.createHash("sha1").update(toSign).digest("hex");
}

export async function uploadRawBufferToCloudinary(buffer, { filename }) {
  const { cloudName, apiKey, apiSecret, folder } = getCloudinaryConfig();
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = filename.replace(/\.[^/.]+$/, "");
  const signature = signUpload({ folder, timestamp, apiSecret, publicId });

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "application/pdf" }), filename);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);
  form.append("public_id", publicId);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || "Cloudinary upload failed.");
  }
  return data;
}
