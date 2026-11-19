// Review helper: generates the Quinn cover for each non-travel category scene.
//   node --env-file=.env --import ./scripts/register-alias.mjs scripts/quinn-category-covers.mjs
import fs from "fs";
import { generateQuinnScene } from "../lib/openaiImage.js";
import { quinnCoverFor } from "../lib/generateGuide.js";
const cats = { fitness: "Fitness", refinery: "Refinery worker", beauty: "Beauty", home: "Home organization" };
await Promise.all(Object.entries(cats).map(async ([k, name]) => {
  const b = await generateQuinnScene({ scene: quinnCoverFor(name), size: "1024x1536" });
  fs.writeFileSync(`tmp/cover-${k}.jpg`, b);
  console.log(k, "ok");
}));
process.exit(0);
