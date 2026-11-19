// Layout stress test: 12 sections, three long recipes per day.
import fs from "fs";
import { renderGuidePdfMagazine } from "../lib/pdfMagazine.js";
const thumb = fs.readFileSync("public/quinn/avatar.jpg");
const rec = (n, img) => ({ type: "recipe", name: `Savory Tofu Scramble ${n}`, servings: "2 servings", ingredients: Array.from({ length: 12 }, (_, i) => `${i + 1} cup ingredient number ${i + 1} chopped`), instructions: "Heat a large skillet over medium heat and add the oil. ".repeat(7), swap: "Swap tofu for chickpeas for a different texture.", imageBytes: img ? thumb : null });
const sections = [{ title: "Your Meal Plan Framework", blocks: [{ type: "paragraph", text: "Intro. ".repeat(40) }] }];
for (let d = 1; d <= 7; d++) sections.push({ title: `Day ${d}`, blocks: [rec(1, d < 3), rec(2, d < 3), rec(3, false)] });
sections.push({ title: "Shopping List", blocks: [{ type: "checklist", title: "Produce", items: Array.from({ length: 30 }, (_, i) => `${i + 1} item`) }] });
sections.push({ title: "Nutrition & Food Safety", blocks: [{ type: "paragraph", text: "Safety. ".repeat(30) }] });
sections.push({ title: "Meal Prep & Storage", blocks: [{ type: "paragraph", text: "Prep. ".repeat(30) }] });
const pdf = await renderGuidePdfMagazine({ title: "7-Day Meal Prep Guide", categoryName: "Kitchen & Meal Planning", objectives: [], sections });
fs.writeFileSync("tmp/meal-preview.pdf", pdf);
console.log("pages via fitz next");
