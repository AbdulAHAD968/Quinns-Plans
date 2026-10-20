import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

// Generates one image and returns raw JPEG bytes for direct embedding into
// the guide PDF -- no Cloudinary upload needed since these images only ever
// live inside the rendered PDF, not as standalone assets.
export async function generateItemImage({ guideTitle, categoryName, itemName, itemDescription }) {
  const prompt = [
    `A polished, appetizing/attractive editorial photo for a personalized digital guide titled "${guideTitle}" (category: ${categoryName}).`,
    `Subject: ${itemName}.`,
    itemDescription ? `Context: ${itemDescription}` : "",
    "Style: natural lighting, realistic, premium but approachable, shot from a flattering angle (overhead for food, clean studio-style for products/gear).",
    "No text overlays, no logos, no watermarks, no people's faces, no brand names visible on packaging.",
  ].filter(Boolean).join("\n");

  const result = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt,
    size: "1024x1024",
    quality: "medium",
    output_format: "jpeg",
  });

  const base64 = result.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI did not return image data.");
  return Buffer.from(base64, "base64");
}

// Generates a wide cover-page hero image for the guide as a whole.
export async function generateCoverImage({ guideTitle, categoryName }) {
  const prompt = [
    `A premium, moody editorial cover photo for a personalized digital guide titled "${guideTitle}" (category: ${categoryName}).`,
    "Style: warm, soft, aspirational lifestyle photography suited to a wellness/lifestyle brand aimed at women -- think soft natural light, warm rose and neutral tones, nothing clinical or corporate.",
    "No text, no logos, no watermarks, no visible faces.",
  ].join("\n");

  const result = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt,
    size: "1536x1024",
    quality: "medium",
    output_format: "jpeg",
  });

  const base64 = result.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI did not return image data.");
  return Buffer.from(base64, "base64");
}
