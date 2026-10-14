import { v2 as cloudinary } from "cloudinary";

function configure() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary environment variables are not configured.");
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return (process.env.CLOUDINARY_UPLOAD_FOLDER || "body-by-quinn/guides").trim().replace(/^\/+|\/+$/g, "");
}

export async function uploadRawBufferToCloudinary(buffer, { filename }) {
  const folder = configure();
  // For raw resources, Cloudinary requires the filename (including extension) in public_id
  const publicId = filename;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "raw", type: "authenticated", folder, public_id: publicId },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// Generates a one-time, server-side-signed, short-lived download URL for an
// authenticated-type asset. Only the server calls this; the URL it returns
// is handed straight to the response and never stored, so a leaked purchase
// record or log line can't be used to fetch the file later.
export function getPrivateDownloadUrl(publicId) {
  configure();
  return cloudinary.utils.private_download_url(publicId, "", {
    resource_type: "raw",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 180,
  });
}
