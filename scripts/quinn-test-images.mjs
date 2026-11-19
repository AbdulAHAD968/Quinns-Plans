// Generates a few "Quinn in Seoul" test images from her reference photos so
// the likeness can be approved before it is used in guides.
//   node --env-file=.env scripts/quinn-test-images.mjs
import OpenAI, { toFile } from "openai";
import fs from "fs";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const refs = await Promise.all(["avatar.jpg", "workout.jpg"].map((n) => toFile(fs.readFileSync(`public/quinn/${n}`), n, { type: "image/jpeg" })));
const scenes = {
  cover: "full-length editorial travel photo of this same woman in Seoul at dusk in winter, wearing a cream wool coat, burgundy scarf and sunglasses pushed up in her hair, with a softly blurred city skyline and warm lights behind her. Vertical composition, premium magazine look.",
  outfit: "this same woman standing in a bright Seoul street in winter wearing a stylish camel coat over a cream knit sweater and dark trousers, carrying a small leather bag, smiling, full body, soft daylight, shallow depth of field.",
  dinner: "this same woman in a burgundy satin dress with a fur stole at an elegant Seoul restaurant, warm evening light, half-length portrait.",
};
for (const [name, scene] of Object.entries(scenes)) {
  const t0 = Date.now();
  const r = await openai.images.edit({
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
    image: refs,
    prompt: `Keep the exact same face, hair colour and identity as the reference photos. Photograph of ${scene} No text, no logos, no watermarks.`,
    size: name === "cover" ? "1024x1536" : "1024x1024",
    quality: "medium",
    output_format: "jpeg",
  });
  fs.writeFileSync(`tmp/quinn-${name}.jpg`, Buffer.from(r.data[0].b64_json, "base64"));
  console.log(name, "ok", Math.round((Date.now() - t0) / 1000) + "s");
}
