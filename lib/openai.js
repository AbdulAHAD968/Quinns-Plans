import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function describeAnswers(questions, answers) {
  return questions
    .map((q) => {
      const raw = answers[q.key];
      if (raw === undefined || raw === null || raw === "") return null;
      const value = Array.isArray(raw) ? raw.join(", ") : raw;
      return `${q.label}: ${value}`;
    })
    .filter(Boolean)
    .join("\n");
}

// Shared content-block vocabulary every section's body is expressed in, so
// the PDF renderer only needs to know these six shapes regardless of
// category. Keeping this small and generic (rather than one schema per
// category) is deliberate -- it covers recipes, exercise programs, packing
// lists, product comparisons, and safety notes without needing bespoke
// parsing logic per guide type.
const BLOCK_SCHEMA_DESCRIPTION = `
Return a JSON object: { "blocks": [ ...block objects... ] }

Each block has a "type" field, one of:

- "paragraph": { "type": "paragraph", "text": "..." }
  Narrative prose only -- plain sentences, no markdown syntax (no **bold**, no literal numbered or bulleted lists inside the text). If the content has a sequence of steps or a list of items, it is NOT a paragraph -- use "numbered_steps" or "checklist" instead, never simulate a list inside paragraph text.

- "numbered_steps": { "type": "numbered_steps", "title": "optional short title or null", "steps": ["step 1", "step 2", ...] }
  Use for ANY sequential procedure (cooking instructions, exercise form cues in order, a preparation workflow, a multi-step routine) -- this is mandatory whenever content is a numbered sequence; the renderer adds the numbers and formatting, so each string in "steps" must be plain prose with no leading number, no "1." prefix, and no markdown.

- "checklist": { "type": "checklist", "title": "optional short title or null", "items": ["item 1", "item 2", ...] }
  Use for unordered actionable items (packing lists, gear lists, daily tasks) where order doesn't matter.

- "table": { "type": "table", "title": "optional short title or null", "columns": ["Col A", "Col B", ...], "rows": [["val", "val", ...], ...] }
  Use for structured data with consistent fields across items: ingredient lists (columns like Ingredient/Amount), shopping lists (Item/Quantity/Section), exercise sets (Exercise/Sets/Reps/Rest), nutrition (Calories/Protein/Carbs/Fat). Every row must have the same number of cells as there are columns.

- "callout": { "type": "callout", "tone": "tip" | "warning" | "note", "text": "..." }
  Use for a single important aside: a safety note, a substitution tip, a budget note. Keep it short (1-3 sentences). Use "warning" only for genuine safety/allergy-relevant cautions, "tip" for helpful asides, "note" for neutral context.

- "comparison": { "type": "comparison", "title": "optional short title or null", "options": [ { "label": "Option A", "pros": ["..."], "notes": "optional one-line note or null" }, { "label": "Option B", "pros": ["..."], "notes": "optional one-line note or null" } ] }
  Use when presenting a genuine tradeoff between 2-3 alternatives (e.g. two storage product types, two exercise substitutions).

- "recipe": { "type": "recipe", "name": "Dish name", "servings": "e.g. 2 servings", "ingredients": ["1 cup rolled oats", "1 1/4 cups almond milk", ...], "instructions": "numbered or sequential prose describing how to prepare it", "swap": "one single-line substitution suggestion, or null" }
  Use this and ONLY this block type for every individual meal/recipe in a meal-planning guide. Every ingredient entry MUST include an exact measured quantity and unit (cups, tbsp, tsp, oz, lb, grams, or count) -- never a vague amount. Do not add a nutrition/calorie figure inside a recipe block; nutrition is handled separately (see rules below).

- "flow": { "type": "flow", "title": "short title", "steps": [ { "label": "2-4 word step name", "detail": "one short line (max 12 words) or null" }, ... ] }
  A visual flowchart of 3-8 connected stages rendered as boxes with arrows. Use it to show a process or decision path the reader moves through (e.g. a shift-day cycle, a packing order, a skincare layering order, a weekly training rotation). Labels must be short.

- "timeline": { "type": "timeline", "title": "short title", "events": [ { "when": "e.g. 1 week out", "label": "short heading", "detail": "one or two short sentences or null" }, ... ] }
  A visual vertical timeline of 3-8 checkpoints in chronological order (each event may carry a "tasks" array of short checkbox tasks). Use it for preparation schedules, progression plans, daily routines by time of day.

- "stats": { "type": "stats", "title": "optional title or null", "items": [ { "value": "e.g. 3-4 L", "label": "short caption e.g. water per shift" }, ... ] }
  2-4 headline numbers shown as large tiles (targets, quantities, durations). Only use numbers that come from the reader's answers or are reasonable general guidance ranges, never invented precise facts.

- "product_picks": { "type": "product_picks", "heading": "THEMED SET NAME e.g. The Organized Suitcase", "subtitle": "one short tagline", "products": [ { "name": "specific product type with its format, e.g. Compression Packing Cubes, 6-piece set", "spec": "size / capacity / material specifics, e.g. 2 medium + 2 small + 1 large cube + laundry pouch", "benefit": "one short sentence (max 14 words) on why it helps THIS reader", "config": "how many to buy and exactly what goes in each, max 22 words, or null", "fit": "how it suits THIS reader's luggage allowance or trip, max 16 words, or null", "alternative": "one alternative option, max 12 words, or null", "image_hint": "plain description of how the product physically looks so an accurate photo can be made, e.g. 'six zippered mesh-top packing cubes in assorted sizes laid flat'", "search_query": "specific shopping search words incl. size/format", "catalog_id": "id from the PRODUCT CATALOG if one fits this slot, otherwise null" }, ... ], "tip": "one short insider tip or null" }
  A premium shoppable card set of exactly 4 recommended products (2-6 allowed). Each card shows the product type, a spec line, why it helps, how many to buy and what to put in it, and an Amazon button. Be specific about sizes, counts and configurations -- never just a bare product type like "packing cubes". Never name a brand, model or price. The image_hint must describe the actual product object (a leakproof travel bottle set is a set of small clear squeezable bottles, NOT a water bottle).

- "packing_list": { "type": "packing_list", "title": "short title", "categories": [ { "name": "Tops", "items": [ { "name": "Lightweight long-sleeve tee", "qty": 3, "note": "short note or null" }, ... ] }, ... ] }
  A checkbox packing list with a whole-number quantity per item. The layout prints the checkbox, the quantity and the grand total itself -- NEVER write totals or "X items in total" in any text. Quantities must be realistic for the trip length and IDENTICAL everywhere the same item is mentioned in the guide.

- "pack_diagram": { "type": "pack_diagram", "variant": "suitcase" | "cubes", "title": "short title", "caption": "one line or null", "zones": [ { "label": "1-3 word name e.g. Shoes", "contents": "exactly what goes here, one short line", "size": "small | medium | large (cubes variant only)" }, ... ] }
  A real drawn diagram. "suitcase" draws a top-down view of an open suitcase with 3-6 numbered zones in packing order (heaviest and bottom layer first). "cubes" draws 3-6 packing cubes at relative sizes with what each holds. Use these whenever explaining how to pack or organize luggage; do not describe layouts only in paragraphs.

Table blocks may add "checkbox": true to print a tick box at the start of every row (use for outfit planners and task lists). Timeline events may add "tasks": ["short task", ...] which print as checkboxes under the event.

Use whichever blocks fit the content -- most sections will mix 2-4 blocks (e.g. a paragraph of framing, then a table, then a callout). Do not force content into a block type it doesn't fit; a section that's pure narrative can be a single paragraph block.
`.trim();

const NUTRITION_HONESTY_RULE = `Never invent or present specific calorie, protein, carbohydrate, or fat numbers as if they were verified -- real nutrition values depend on exact brands, yields, and cooking methods you cannot know, and a fabricated number presented as fact is misleading. If a nutrition table is genuinely useful, either omit it, or clearly frame any figure as a rough estimate the reader should verify against the actual ingredients and brands they use (e.g. via a nutrition-analysis tool), and say so explicitly rather than silently presenting round numbers as exact.`;

const NO_INVENTED_MOTIVATION_RULE = `Never invent a goal, motivation, backstory, or context for the reader that was not actually stated in their answers below (e.g. do not decide on your own that a fitness plan is "for self-defense," that a travel guide is "for a honeymoon," or that a home organization project is "before a big move") unless the reader's answers actually said so. If their answers don't specify a reason, write generally about the stated goal itself (e.g. "building strength") without inventing a narrative reason behind it. An invented detail presented as if it came from the reader is worse than a generic sentence, because it misleads them into thinking the guide understood something about them that it didn't.`;

// Flattens a block back into a short plain-text line so later sections can
// be given a compact digest of what earlier sections already said, without
// passing full block JSON (which would bloat the prompt for a long guide).
function summarizeBlockForContext(block) {
  if (block.type === "paragraph") return block.text;
  if (block.type === "numbered_steps") return `${block.title ? block.title + ": " : ""}${block.steps.join(" | ")}`;
  if (block.type === "checklist") return `${block.title ? block.title + ": " : ""}${block.items.join(", ")}`;
  if (block.type === "table") return `${block.title ? block.title + ": " : ""}columns [${block.columns.join(", ")}]; rows: ${block.rows.map((r) => r.join("/")).join(" | ")}`;
  if (block.type === "callout") return `(${block.tone}) ${block.text}`;
  if (block.type === "comparison") return `${block.title ? block.title + ": " : ""}${block.options.map((o) => `${o.label} (${o.pros.join(", ")})`).join(" vs. ")}`;
  if (block.type === "flow") return `${block.title}: ${block.steps.map((x) => x.label).join(" > ")}`;
  if (block.type === "timeline") return `${block.title}: ${block.events.map((e) => `${e.when} ${e.label}`).join(" | ")}`;
  if (block.type === "stats") return `${block.title || "Key numbers"}: ${block.items.map((i) => `${i.value} ${i.label}`).join(", ")}`;
  if (block.type === "product_picks") return `${block.heading}: ${block.products.map((x) => x.name).join(", ")}`;
  if (block.type === "packing_list") return `${block.title || "Packing list"}: ${block.categories.map((c) => `${c.name} [${c.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}]`).join("; ")}`;
  if (block.type === "pack_diagram") return `${block.title || "Pack diagram"}: ${block.zones.map((z) => `${z.label} (${z.contents})`).join("; ")}`;
  if (block.type === "recipe") return `${block.name} (${block.servings || "servings unspecified"}): ${block.ingredients.join("; ")}`;
  return "";
}

function describePriorSections(priorSections) {
  return priorSections
    .filter((s) => s.blocks.length)
    .map((s) => `## ${s.title}\n${s.blocks.map(summarizeBlockForContext).filter(Boolean).join("\n")}`)
    .join("\n\n");
}

export async function generateSectionContent({ guideTitle, questions, answers, section, knowledgeSources, priorSections = [], catalog = [], extraContext = "" }) {
  const answerSummary = describeAnswers(questions, answers);
  const sourcesSummary = knowledgeSources.length
    ? knowledgeSources.map((s) => `- ${s.title}${s.excerpt ? `: ${s.excerpt}` : ""}`).join("\n")
    : "";
  const priorSummary = describePriorSections(priorSections);
  const wantsProducts = /product_picks/.test(section.contentRules || "");
  const catalogSummary = wantsProducts && catalog.length
    ? catalog.map((c) => `- id=${c.id} | ${c.name}${c.group ? ` | group: ${c.group}` : ""}${c.benefit ? ` | ${c.benefit}` : ""}`).join("\n")
    : "";

  const systemPrompt = [
    `You are writing one section of a personalized guide titled "${guideTitle}". This is a paid digital product the reader bought expecting the quality of a professionally produced guide, not a generic blog checklist.`,
    `You are writing the content for the section "${section.title}". Do not repeat the section title or add a heading - the title is rendered separately.`,
    `Be concrete and specific, not generic. Prefer exact numbers, quantities, names, and sequences over vague language. Where the section guidance below asks for measurements, quantities, sets/reps, product types, dimensions, timelines, or substitutions, you MUST include them explicitly - never write a placeholder like "add your preferred amount" or "choose a suitable product" in place of an actual specific recommendation.`,
    `Every recommendation must be genuinely personalized to the reader's actual answers below - two readers with different answers should get meaningfully different content, not the same text with a word swapped.`,
    NO_INVENTED_MOTIVATION_RULE,
    `Never invent or name a specific commercial brand, product name, or price - you cannot know current real prices or whether a specific product still exists, and a wrong one undermines trust. Describe the product type and its defining features instead (e.g. "a multi-surface spray cleaner" not "Method All-Purpose Cleaner for $5"), specific and detailed enough that the reader can find and compare real options themselves.`,
    NUTRITION_HONESTY_RULE,
    `Do not restate the questionnaire back to them, and do not pad the section with filler sentences to make it look longer.`,
    extraContext,
    sourcesSummary ? `Ground any factual or safety-relevant claims in this reviewed reference material where relevant:\n${sourcesSummary}` : "",
    priorSummary
      ? `Earlier sections of this same guide already established specific facts (a schedule, specific exercises/recipes/items, specific numbers). You MUST stay consistent with them -- do not contradict a number, a day, an item name, or a quantity that was already set, and do not introduce a different structure (e.g. a different number of weekly sessions, a different set of named exercises or recipes) than what earlier sections already committed to:\n\n${priorSummary}`
      : "",
    catalogSummary
      ? `PRODUCT CATALOG (hand-picked real products with affiliate links). For every product_picks slot, if a catalog item genuinely fits what the reader needs, you MUST use it: set "catalog_id" to its id and use its name. Only fall back to a generic product type (catalog_id null) when nothing in the catalog fits. Never invent ids.\n${catalogSummary}`
      : "",
    `Structure your response as content blocks so it can be laid out like a real book, not a wall of text.\n\n${BLOCK_SCHEMA_DESCRIPTION}`,
  ].filter(Boolean).join("\n\n");

  const userPrompt = [
    `Reader's answers:\n${answerSummary || "(no answers provided)"}`,
    `Section guidance from the editorial team: ${section.contentRules || "Use your best judgment for this section."}`,
  ].join("\n\n");

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { blocks: [{ type: "paragraph", text: raw.trim() }] };
  }

  return sanitizeBlocks(parsed.blocks, catalog);
}

const VALID_TYPES = new Set(["paragraph", "numbered_steps", "checklist", "table", "callout", "comparison", "recipe", "flow", "timeline", "stats", "product_picks", "packing_list", "pack_diagram"]);
const VALID_TONES = new Set(["tip", "warning", "note"]);

// Defensive normalization: the model is instructed to follow the schema above,
// but LLM JSON output is never fully trustworthy -- a malformed block here
// would otherwise throw deep inside the PDF renderer. Anything that doesn't
// fit cleanly is dropped rather than rendered broken.
const AMAZON_DOMAINS = ["amazon.com", "amazon.co.uk", "amazon.ca", "amazon.de", "amazon.fr", "amazon.it", "amazon.es", "amazon.nl", "amazon.se", "amazon.pl", "amazon.com.au", "amazon.com.mx", "amazon.com.br", "amazon.com.tr", "amazon.in", "amazon.co.jp", "amazon.sg", "amazon.ae", "amazon.sa", "amazon.eg", "amazon.be", "amzn.to", "amzn.com", "a.co"];
const isAmazonHost = (host) => AMAZON_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
function isSafeAmazonUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && isAmazonHost(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

const optText = (v, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : "");
function productDetails(x) {
  return {
    spec: optText(x.spec, 120),
    config: optText(x.config, 180),
    fit: optText(x.fit, 140),
    alternative: optText(x.alternative, 100),
    imageHint: optText(x.image_hint, 200),
  };
}

export function sanitizeBlocks(blocks, catalog = []) {
  const catalogById = new Map(catalog.map((c) => [String(c.id), c]));
  if (!Array.isArray(blocks)) return [];
  const clean = [];

  for (const block of blocks) {
    if (!block || typeof block !== "object" || !VALID_TYPES.has(block.type)) continue;

    if (block.type === "paragraph") {
      if (typeof block.text === "string" && block.text.trim()) clean.push({ type: "paragraph", text: block.text.trim() });
    } else if (block.type === "numbered_steps") {
      const steps = Array.isArray(block.steps) ? block.steps.filter((s) => typeof s === "string" && s.trim()) : [];
      if (steps.length) clean.push({ type: "numbered_steps", title: typeof block.title === "string" ? block.title : null, steps });
    } else if (block.type === "checklist") {
      const items = Array.isArray(block.items) ? block.items.filter((s) => typeof s === "string" && s.trim()) : [];
      if (items.length) clean.push({ type: "checklist", title: typeof block.title === "string" ? block.title : null, items });
    } else if (block.type === "table") {
      const columns = Array.isArray(block.columns) ? block.columns.filter((c) => typeof c === "string") : [];
      const rows = Array.isArray(block.rows)
        ? block.rows.filter((r) => Array.isArray(r) && r.length === columns.length).map((r) => r.map((c) => String(c ?? "")))
        : [];
      if (columns.length && rows.length) clean.push({ type: "table", title: typeof block.title === "string" ? block.title : null, columns, rows, checkbox: block.checkbox === true });
    } else if (block.type === "callout") {
      if (typeof block.text === "string" && block.text.trim()) {
        clean.push({ type: "callout", tone: VALID_TONES.has(block.tone) ? block.tone : "note", text: block.text.trim() });
      }
    } else if (block.type === "comparison") {
      const options = Array.isArray(block.options)
        ? block.options
            .filter((o) => o && typeof o.label === "string" && o.label.trim())
            .map((o) => ({
              label: o.label.trim(),
              pros: Array.isArray(o.pros) ? o.pros.filter((p) => typeof p === "string" && p.trim()) : [],
              notes: typeof o.notes === "string" && o.notes.trim() ? o.notes.trim() : null,
            }))
        : [];
      if (options.length >= 2) clean.push({ type: "comparison", title: typeof block.title === "string" ? block.title : null, options });
    } else if (block.type === "flow") {
      const steps = Array.isArray(block.steps)
        ? block.steps.filter((x) => x && typeof x.label === "string" && x.label.trim()).slice(0, 8).map((x) => ({ label: x.label.trim(), detail: typeof x.detail === "string" && x.detail.trim() ? x.detail.trim() : null }))
        : [];
      if (steps.length >= 3) clean.push({ type: "flow", title: typeof block.title === "string" ? block.title : "", steps });
    } else if (block.type === "timeline") {
      const events = Array.isArray(block.events)
        ? block.events.filter((e) => e && typeof e.label === "string" && e.label.trim()).slice(0, 8).map((e) => ({ when: typeof e.when === "string" ? e.when.trim() : "", label: e.label.trim(), detail: typeof e.detail === "string" && e.detail.trim() ? e.detail.trim() : null, tasks: Array.isArray(e.tasks) ? e.tasks.filter((t) => typeof t === "string" && t.trim()).slice(0, 6).map((t) => t.trim()) : [] }))
        : [];
      if (events.length >= 3) clean.push({ type: "timeline", title: typeof block.title === "string" ? block.title : "", events });
    } else if (block.type === "stats") {
      const items = Array.isArray(block.items)
        ? block.items.filter((i) => i && (typeof i.value === "string" || typeof i.value === "number") && typeof i.label === "string").slice(0, 4).map((i) => ({ value: String(i.value).trim(), label: i.label.trim() }))
        : [];
      if (items.length >= 2) clean.push({ type: "stats", title: typeof block.title === "string" && block.title.trim() ? block.title : null, items });
    } else if (block.type === "product_picks") {
      const products = Array.isArray(block.products)
        ? block.products
            .filter((x) => x && typeof x.name === "string" && x.name.trim())
            .slice(0, 6)
            .map((x) => {
              const hit = typeof x.catalog_id === "string" ? catalogById.get(x.catalog_id) : null;
              if (hit && isSafeAmazonUrl(hit.url)) {
                return { ...productDetails(x), name: hit.name, benefit: (typeof x.benefit === "string" && x.benefit.trim()) || hit.benefit || "", url: hit.url, curated: true };
              }
              const name = x.name.trim();
              const query = (typeof x.search_query === "string" && x.search_query.trim() ? x.search_query.trim() : name).slice(0, 120);
              return {
                ...productDetails(x),
                name,
                benefit: typeof x.benefit === "string" ? x.benefit.trim() : "",
                url: buildAmazonSearchUrl(query),
              };
            })
        : [];
      if (products.length >= 2) {
        clean.push({
          type: "product_picks",
          heading: typeof block.heading === "string" && block.heading.trim() ? block.heading.trim() : "Recommended picks",
          subtitle: typeof block.subtitle === "string" && block.subtitle.trim() ? block.subtitle.trim() : null,
          products,
          tip: typeof block.tip === "string" && block.tip.trim() ? block.tip.trim() : null,
        });
      }
    } else if (block.type === "packing_list") {
      const categories = Array.isArray(block.categories)
        ? block.categories
            .filter((c) => c && typeof c.name === "string" && c.name.trim() && Array.isArray(c.items))
            .slice(0, 10)
            .map((c) => ({
              name: c.name.trim(),
              items: c.items
                .filter((i) => i && typeof i.name === "string" && i.name.trim())
                .slice(0, 20)
                .map((i) => {
                  const qty = Math.round(Number(i.qty));
                  return { name: i.name.trim(), qty: Number.isFinite(qty) && qty > 0 ? Math.min(qty, 99) : 1, note: typeof i.note === "string" && i.note.trim() ? i.note.trim() : "" };
                }),
            }))
            .filter((c) => c.items.length)
        : [];
      if (categories.length) clean.push({ type: "packing_list", title: typeof block.title === "string" && block.title.trim() ? block.title.trim() : "Packing list", categories });
    } else if (block.type === "pack_diagram") {
      const zones = Array.isArray(block.zones)
        ? block.zones
            .filter((z) => z && typeof z.label === "string" && z.label.trim())
            .slice(0, 6)
            .map((z) => ({
              label: z.label.trim().slice(0, 30),
              contents: typeof z.contents === "string" ? z.contents.trim().slice(0, 140) : "",
              size: ["small", "medium", "large"].includes(z.size) ? z.size : "medium",
            }))
        : [];
      if (zones.length >= 3) {
        clean.push({
          type: "pack_diagram",
          variant: block.variant === "cubes" ? "cubes" : "suitcase",
          title: typeof block.title === "string" && block.title.trim() ? block.title.trim() : "",
          caption: typeof block.caption === "string" && block.caption.trim() ? block.caption.trim() : null,
          zones,
        });
      }
    } else if (block.type === "recipe") {
      const ingredients = Array.isArray(block.ingredients) ? block.ingredients.filter((i) => typeof i === "string" && i.trim()) : [];
      if (typeof block.name === "string" && block.name.trim() && ingredients.length && typeof block.instructions === "string" && block.instructions.trim()) {
        clean.push({
          type: "recipe",
          name: block.name.trim(),
          servings: typeof block.servings === "string" ? block.servings.trim() : null,
          ingredients,
          instructions: block.instructions.trim(),
          swap: typeof block.swap === "string" && block.swap.trim() ? block.swap.trim() : null,
        });
      }
    }
  }

  return clean;
}

// Pulls out the names of blocks worth illustrating (currently just recipes)
// so the caller can generate one image per item without re-parsing blocks.
export function extractIllustrableItems(blocks) {
  const items = [];
  for (const b of blocks) {
    if (b.type === "recipe") items.push({ name: b.name, description: b.ingredients.slice(0, 4).join(", "), target: b });
    if (b.type === "product_picks") for (const pr of b.products) items.push({ name: pr.name, description: `${pr.imageHint || pr.spec || pr.name}. Show exactly this product type and nothing else: a single product shot on a clean neutral background`, target: pr });
  }
  return items;
}

// Builds an Amazon search URL from generic words so we never fabricate a
// specific product link; an Associates tag is appended when configured.
function buildAmazonSearchUrl(query) {
  const params = new URLSearchParams({ k: query });
  if (process.env.AMAZON_ASSOCIATE_TAG) params.set("tag", process.env.AMAZON_ASSOCIATE_TAG);
  return `https://www.amazon.com/s?${params.toString()}`;
}


// Quality-control pass: given a section's blocks, the system's authoritative
// facts and rules, and issues already found by pattern checks, the model
// returns replacements only for blocks that are wrong. Product blocks are never
// rewritten here (their links and images are bound to the original).
export async function reviseSectionBlocks({ sectionTitle, blocks, facts, rules, issues }) {
  const editable = blocks.map((b, index) => ({ index, b })).filter(({ b }) => b.type !== "product_picks");
  if (!editable.length) return blocks;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You are the quality-control editor for a paid personalized travel guide. Check ONE section against the authoritative facts and rules below and fix real errors only.",
          facts,
          rules,
          "Check for: contradicted dates, destination, weather, quantities (e.g. one pair per day plus a spare must equal days + 1 -- the REQUIRED QUANTITIES are law); any restriction applied to the wrong bag type (3.4 oz liquid limit belongs to carry-on only); power banks or lithium batteries recommended for checked luggage; knives, multi-tools or stoves recommended without checked-bag / airline-rule caveats; statements of total item counts; instructions that contradict each other; anything unsafe or unrealistic for the stated luggage allowance.",
          `Return JSON: { "fixes": [ { "index": <block index>, "block": <the complete corrected block in the same schema, or null to delete it> } ] }. Return { "fixes": [] } if nothing is wrong. Only include blocks that need a change. Keep the block's type and structure; change only what is wrong. Never add brand names.\n\n${BLOCK_SCHEMA_DESCRIPTION}`,
        ].join("\n\n"),
      },
      {
        role: "user",
        content: `Section: ${sectionTitle}\n${issues.length ? `Pattern checks flagged:\n- ${issues.join("\n- ")}\n\n` : ""}Blocks:\n${JSON.stringify(editable.map(({ index, b }) => ({ index, ...b })))}`,
      },
    ],
  });

  let fixes;
  try {
    fixes = JSON.parse(completion.choices[0]?.message?.content || "{}").fixes;
  } catch {
    return blocks;
  }
  if (!Array.isArray(fixes)) return blocks;

  const next = [...blocks];
  const editableIdx = new Set(editable.map((e) => e.index));
  for (const fix of fixes) {
    if (!fix || !Number.isInteger(fix.index) || !editableIdx.has(fix.index)) continue;
    if (fix.block === null) { next[fix.index] = null; continue; }
    const [clean] = sanitizeBlocks([fix.block]);
    if (clean && clean.type === blocks[fix.index].type) next[fix.index] = clean;
  }
  return next.filter(Boolean);
}
