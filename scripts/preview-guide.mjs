// Renders a sample guide (every block type) with the magazine renderer so the
// layout can be reviewed without calling OpenAI or the database.
//
//   node scripts/preview-guide.mjs [out.pdf]
import fs from "fs";
import { renderGuidePdfMagazine } from "../lib/pdfMagazine.js";

const out = process.argv[2] || "preview-guide.pdf";
const photo = fs.readFileSync("public/quinn/uniform.jpg");
const thumb = fs.readFileSync("public/quinn/avatar.jpg");

const sections = [
  { title: "Your Trip at a Glance", blocks: [
    { type: "stats", items: [{ value: "11", label: "Nights" }, { value: "22°F / 18°F", label: "Avg high / low" }, { value: "Carry-on", label: "Luggage plan" }, { value: "2", label: "Planned activities" }] },
    { type: "table", title: "Trip Snapshot", columns: ["Detail", "Your trip"], rows: [["Destination", "Seoul, Korea"], ["Dates", "Dec 30, 2026 to Jan 10, 2027"], ["Length", "11 nights"], ["Weather", "Cold: layers, coats, thermals"], ["Activities", "Sightseeing, formal dinners"]] },
    { type: "paragraph", text: "Seoul in winter is crisp, bright and cold, with dry air and the occasional dusting of snow. Plan for warm layers you can peel off indoors, where heating is generous." },
    { type: "callout", tone: "tip", text: "Pick one formal dinner look and choose versatile pieces you can mix and match across the trip." },
  ] },
  { title: "Your Packing List", blocks: [
    { type: "packing_list", title: "Everything you need", categories: [
      { name: "Clothing", items: [{ name: "Long-sleeve tees", qty: 2, note: "Merino if possible" }, { name: "Dressy blouses", qty: 2 }, { name: "Warm trousers", qty: 3 }, { name: "Dress pants", qty: 1 }, { name: "Insulated jacket", qty: 1 }, { name: "Stylish wool coat", qty: 1, note: "Wear on the plane" }] },
      { name: "Underwear & basics", items: [{ name: "Underwear", qty: 8 }, { name: "Socks", qty: 8 }, { name: "Warm pajama set", qty: 2 }] },
      { name: "Accessories", items: [{ name: "Jewelry (versatile)", qty: 1 }, { name: "Scarf & gloves", qty: 1 }, { name: "Beanie or hat", qty: 1 }] },
      { name: "Toiletries", items: [{ name: "Travel bottle set", qty: 1, note: "Under 3.4 oz each" }, { name: "Medication", qty: 1 }] },
    ] },
  ] },
  { title: "How to Pack", blocks: [
    { type: "pack_diagram", variant: "suitcase", title: "Suitcase layout", zones: [{ label: "Shoes", contents: "Bottom, near the wheels" }, { label: "Heavy items", contents: "Coat, jeans and boots against the wheels" }, { label: "Packing cubes", contents: "Tops, bottoms and underwear by outfit" }, { label: "Toiletries", contents: "Leak-proof, top pocket" }], caption: "Heavy things low, soft things high." },
    { type: "pack_diagram", variant: "cubes", title: "Packing cubes", zones: [{ label: "Tops", size: "large", contents: "Tees and blouses" }, { label: "Bottoms", size: "medium", contents: "Trousers" }, { label: "Basics", size: "small", contents: "Underwear, socks" }], caption: "" },
    { type: "numbered_steps", title: "Step by step", steps: ["Start with shoes at the bottom, along the wheels.", "Add heavy items next.", "Slot in packing cubes, packed by outfit.", "Layer the bulky knits on top."] },
    { type: "callout", tone: "tip", text: "Use packing cubes to stay organized and save space." },
  ] },
  { title: "Airline & Security Rules", blocks: [
    { type: "table", title: "What goes where", columns: ["Item", "Carry-on", "Checked", "Notes"], rows: [["Liquids", "3.4 oz max", "Allowed", "Clear zip bag"], ["Power banks", "Under 100 Wh", "Not allowed", "Carry-on only"], ["Medication", "Allowed", "Allowed", "Keep in carry-on"]] },
    { type: "callout", tone: "warning", text: "Lithium batteries and power banks must travel in your carry-on, never in checked luggage." },
    { type: "stats", title: "At a glance", items: [{ value: "3.4 oz", label: "Liquid limit" }, { value: "100 Wh", label: "Power bank limit" }, { value: "50 lb", label: "Typical checked bag" }] },
  ] },
  { title: "Preparation Timeline", blocks: [
    { type: "timeline", events: [
      { when: "3 Weeks Out", label: "Dec 9", detail: "Review itinerary and activities", tasks: ["Confirm dinner reservations", "Check passport validity"] },
      { when: "1 Week Out", label: "Dec 23", detail: "Finalize packing list", tasks: ["Prioritize lower cabin items", "Charge laptop and camera"] },
      { when: "Day Before", label: "Dec 29", detail: "Lay out clothes for each day", tasks: ["Double-check documents"] },
      { when: "Departure Day", label: "Dec 30", detail: "Arrive at the airport early", tasks: [] },
    ] },
    { type: "flow", title: "Airport day", steps: [{ label: "Arrive", detail: "3 hours before an international flight" }, { label: "Check in", detail: "Drop your bag" }, { label: "Security", detail: "Liquids out" }, { label: "Board", detail: "Keep passport handy" }] },
  ] },
  { title: "The Luxury Travel Edit", blocks: [
    { type: "product_picks", heading: "Luxury Picks", subtitle: "Invest once, travel for years.", tip: "Choose one hard-shell carry-on and pair it with cubes.", products: [
      { name: "Premium Compression Packing Cubes, 6-Pack", brand: "LeanTravel", curated: true, tier: "premium", priceRange: "$25-$35", description: "Six compression packing cubes with double zippers and breathable mesh panels.", benefit: "Cuts suitcase bulk without wrinkling knits.", url: "https://a.co/d/07aj7FsT", imageBytes: thumb },
      { name: "5-Piece Packing Cubes Set with Laundry Bag", brand: "Shacke", curated: true, tier: "budget", priceRange: "$15-$20", description: "Five-piece set with a laundry bag.", benefit: "Keeps clean and worn clothes apart.", url: "https://a.co/d/00Cle2An", imageBytes: thumb },
      { name: "Hard-shell carry-on spinner", curated: false, spec: "21-22 inch, 4 spinner wheels", benefit: "Fits overhead bins.", config: "Polycarbonate shell", fit: "Handles 11 nights in winter layers.", alternative: "Soft-shell expandable", url: "https://amazon.com/s?k=carry+on", imageBytes: thumb },
    ] },
  ] },
  { title: "Your Outfit Planner", blocks: [
    { type: "comparison", title: "Two looks", options: [{ label: "Sightseeing", pros: ["Merino base layer", "Wool coat", "Waterproof boots"], notes: "Warm and walkable." }, { label: "Formal dinner", pros: ["Dress pants", "Silk blouse", "Statement earrings"], notes: "Swap shoes in the restaurant." }] },
    { type: "checklist", title: "Day-by-day", items: ["Day 1-2: Sightseeing, cozy layers", "Day 3-4: Elegant dinner look", "Day 5-6: Cold weather, warm and practical", "Day 7: Travel day, comfortable and easy", "Day 8: Museum day", "Day 9: Market day", "Day 10: Spa", "Day 11: Departure"] },
    { type: "recipe", name: "Hot ginger tea for the flight", servings: "Serves 1", ingredients: ["1 inch fresh ginger", "1 tsp honey", "hot water"], instructions: "Steep sliced ginger in hot water for 5 minutes and stir in honey.", swap: "Use lemon in place of honey.", imageBytes: thumb },
  ] },
];

// Optional Quinn test images (scripts/quinn-test-images.mjs) for cover, outfit gallery and banner.
const opt = (f) => (fs.existsSync(f) ? fs.readFileSync(f) : null);
const quinnCover = opt("tmp/quinn-cover.jpg");
const outfit = sections.find((x) => /outfit/i.test(x.title));
if (opt("tmp/quinn-outfit.jpg")) outfit.gallery = [{ bytes: opt("tmp/quinn-outfit.jpg"), caption: "Sightseeing look" }, { bytes: opt("tmp/quinn-dinner.jpg"), caption: "Dinner look" }, { bytes: opt("tmp/quinn-cover.jpg"), caption: "Evening look" }];

const pdf = await renderGuidePdfMagazine({
  title: "The Luxury Travel Edit",
  categoryName: "Travel & Lifestyle",
  objectives: ["Pack light", "Look polished", "Travel stress-free", "Stay organized"],
  sections,
  coverImageBytes: quinnCover || photo,
  bannerImageBytes: opt(process.env.BANNER || "tmp/quinn-outfit.jpg"),
  cover: { title: "The Luxury Travel Edit", subtitle: "Seoul, Korea", details: "DEC 30, 2026 - JAN 10, 2027  |  11 NIGHTS", preparedFor: "Prepared for Sarah" },
});
fs.writeFileSync(out, pdf);
console.log(`Wrote ${out} (${pdf.length} bytes)`);
