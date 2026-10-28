// Deterministic quality checks run on generated blocks before the model-based
// review. These catch the specific, known-bad statements (wrong-bag liquid
// limits, power banks in checked luggage, total counts) so they are flagged
// with certainty rather than relying on the reviewer to notice them.

function collectStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "url" || k === "imageBytes" || k === "imageHint") continue;
      collectStrings(v, out);
    }
  }
  return out;
}

function sentencesOf(block) {
  return collectStrings(block)
    .flatMap((t) => t.split(/(?<=[.!?])\s+|\n+/))
    .map((t) => t.trim())
    .filter(Boolean);
}

const CARRY = /carry[- ]?on|cabin|personal item|hand luggage/i;
const NEGATION = /\b(never|not|don'?t|do not|avoid|instead of|rather than|prohibited|cannot|can'?t|must not)\b/i;

export function findIssues(blocks, facts) {
  const issues = [];
  blocks.forEach((block, i) => {
    if (block.type === "product_picks") return;
    for (const s of sentencesOf(block)) {
      if (s.length < 30) continue;
      if (/3\.4|100 ?ml|quart/i.test(s) && /\bchecked\b/i.test(s) && !CARRY.test(s)) {
        issues.push(`Block ${i}: the 3.4 oz / 100 ml liquid limit is mentioned for checked luggage; it applies to carry-on only: "${s.slice(0, 140)}"`);
      }
      if (/power ?bank|battery|batteries|lithium/i.test(s) && /\bchecked\b/i.test(s) && !CARRY.test(s) && !NEGATION.test(s)) {
        issues.push(`Block ${i}: power banks / lithium batteries must go in carry-on, never checked: "${s.slice(0, 140)}"`);
      }
      if (/jewelry|jewellery|valuables|passport|medication|laptop|camera|documents/i.test(s) && /(in|into|to) (?:your |the )?checked/i.test(s) && !CARRY.test(s) && !NEGATION.test(s)) {
        issues.push(`Block ${i}: valuables, documents, medication or electronics belong in the carry-on, not checked luggage: "${s.slice(0, 140)}"`);
      }
      if (/multi-?tool|knife|knives|stove|razor blade/i.test(s) && !/checked|airline|tsa|restrict|prohibit|allowed|not permitted|rules|empty|check with/i.test(s)) {
        issues.push(`Block ${i}: sharp tool / camp stove recommended without transport rules: "${s.slice(0, 140)}"`);
      }
      if (/\b\d+\s+(total\s+)?(items|pieces|garments)\b|\btotal of \d+/i.test(s)) {
        issues.push(`Block ${i}: states a total item count in prose (totals are computed by the layout; remove it): "${s.slice(0, 140)}"`);
      }
      const under = s.match(/\b(\d+)\s+(?:pairs? of )?(?:underwear|panties|briefs)\b/i);
      if (under && facts?.quantities && Number(under[1]) !== facts.quantities.underwear) {
        issues.push(`Block ${i}: underwear quantity ${under[1]} contradicts the required ${facts.quantities.underwear}: "${s.slice(0, 140)}"`);
      }
    }
  });
  return issues;
}
