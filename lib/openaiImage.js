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

// Vision check that a generated product photo really shows the product it is
// labelled with (e.g. a travel-bottle set, not a water bottle). Fails open: if
// the check itself errors, the image is kept.
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

export async function imageMatchesProduct(bytes, { name, hint }) {
  try {
    const completion = await openai.chat.completions.create({
      model: VISION_MODEL,
      temperature: 0,
      max_tokens: 5,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Product that should be shown: "${name}"${hint ? ` (${hint})` : ""}. Does this photo clearly show that exact kind of product as its main subject? Be strict: a different product type (for example a water bottle instead of a set of small travel toiletry bottles, or a handbag instead of a toiletry bag) is NO. Answer with exactly YES or NO.`,
            },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`, detail: "low" } },
          ],
        },
      ],
    });
    return /^\s*yes/i.test(completion.choices[0]?.message?.content || "");
  } catch (err) {
    console.error("Image verification skipped:", err?.message || err);
    return true;
  }
}

// Generates a product photo and verifies it; retries once, and returns null
// (the card renders without a photo) rather than ever showing a wrong product.
export async function generateVerifiedProductImage({ guideTitle, categoryName, itemName, itemDescription, hint }) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const bytes = await generateItemImage({ guideTitle, categoryName, itemName, itemDescription });
    if (await imageMatchesProduct(bytes, { name: itemName, hint })) return bytes;
  }
  return null;
}
