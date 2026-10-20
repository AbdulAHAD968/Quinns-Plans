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

Use whichever blocks fit the content -- most sections will mix 2-4 blocks (e.g. a paragraph of framing, then a table, then a callout). Do not force content into a block type it doesn't fit; a section that's pure narrative can be a single paragraph block.
`.trim();

const NUTRITION_HONESTY_RULE = `Never invent or present specific calorie, protein, carbohydrate, or fat numbers as if they were verified -- real nutrition values depend on exact brands, yields, and cooking methods you cannot know, and a fabricated number presented as fact is misleading. If a nutrition table is genuinely useful, either omit it, or clearly frame any figure as a rough estimate the reader should verify against the actual ingredients and brands they use (e.g. via a nutrition-analysis tool), and say so explicitly rather than silently presenting round numbers as exact.`;

function describeRecipes(recipes) {
  return recipes
    .map((r) => `${r.name} (${r.servings || "servings unspecified"}): ${r.ingredients.join("; ")}`)
    .join("\n");
}

export async function generateSectionContent({ guideTitle, questions, answers, section, knowledgeSources, priorRecipes = [] }) {
  const answerSummary = describeAnswers(questions, answers);
  const sourcesSummary = knowledgeSources.length
    ? knowledgeSources.map((s) => `- ${s.title}${s.excerpt ? `: ${s.excerpt}` : ""}`).join("\n")
    : "";
  const recipesSummary = priorRecipes.length ? describeRecipes(priorRecipes) : "";

  const systemPrompt = [
    `You are writing one section of a personalized guide titled "${guideTitle}". This is a paid digital product the reader bought expecting the quality of a professionally produced guide, not a generic blog checklist.`,
    `You are writing the content for the section "${section.title}". Do not repeat the section title or add a heading - the title is rendered separately.`,
    `Be concrete and specific, not generic. Prefer exact numbers, quantities, names, and sequences over vague language. Where the section guidance below asks for measurements, quantities, sets/reps, product types, dimensions, timelines, or substitutions, you MUST include them explicitly - never write a placeholder like "add your preferred amount" or "choose a suitable product" in place of an actual specific recommendation.`,
    `Every recommendation must be genuinely personalized to the reader's actual answers below - two readers with different answers should get meaningfully different content, not the same text with a word swapped.`,
    `Never invent or name a specific commercial brand, product name, or price - you cannot know current real prices or whether a specific product still exists, and a wrong one undermines trust. Describe the product type and its defining features instead (e.g. "a multi-surface spray cleaner" not "Method All-Purpose Cleaner for $5"), specific and detailed enough that the reader can find and compare real options themselves.`,
    NUTRITION_HONESTY_RULE,
    `Do not restate the questionnaire back to them, and do not pad the section with filler sentences to make it look longer.`,
    sourcesSummary ? `Ground any factual or safety-relevant claims in this reviewed reference material where relevant:\n${sourcesSummary}` : "",
    `Structure your response as content blocks so it can be laid out like a real book, not a wall of text.\n\n${BLOCK_SCHEMA_DESCRIPTION}`,
  ].filter(Boolean).join("\n\n");

  const userPrompt = [
    `Reader's answers:\n${answerSummary || "(no answers provided)"}`,
    recipesSummary ? `Recipes already written earlier in this guide (reconcile against these exactly -- do not invent different ingredients or quantities than what's listed here):\n${recipesSummary}` : "",
    `Section guidance from the editorial team: ${section.contentRules || "Use your best judgment for this section."}`,
  ].filter(Boolean).join("\n\n");

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

  return sanitizeBlocks(parsed.blocks);
}

const VALID_TYPES = new Set(["paragraph", "numbered_steps", "checklist", "table", "callout", "comparison", "recipe"]);
const VALID_TONES = new Set(["tip", "warning", "note"]);

// Defensive normalization: the model is instructed to follow the schema above,
// but LLM JSON output is never fully trustworthy -- a malformed block here
// would otherwise throw deep inside the PDF renderer. Anything that doesn't
// fit cleanly is dropped rather than rendered broken.
function sanitizeBlocks(blocks) {
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
      if (columns.length && rows.length) clean.push({ type: "table", title: typeof block.title === "string" ? block.title : null, columns, rows });
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
  return blocks.filter((b) => b.type === "recipe").map((b) => ({ name: b.name, description: b.ingredients.slice(0, 4).join(", ") }));
}
