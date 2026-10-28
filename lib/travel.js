// Travel & Lifestyle profile: everything about a trip that must be COMPUTED or
// KNOWN rather than left to the language model -- real dates, real weather,
// consistent quantities, and the airline/TSA rules that guides most often
// get wrong. The model is handed these as authoritative facts.

const DAY_MS = 86400000;

function parseISO(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

const fmtShort = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const fmtLong = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const isoDay = (d) => d.toISOString().slice(0, 10);

function cleanText(value, max = 80) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

const LENGTH_TO_NIGHTS = { weekend: 2, week: 6, two_weeks_plus: 13 };
const LUGGAGE_LABEL = { carry_on_only: "Carry-on only", one_checked: "One checked bag plus a carry-on and personal item", no_limit: "No real luggage limit" };

// Preparation checkpoints counted back from departure.
const PREP_OFFSETS = [
  { days: 14, label: "2 weeks out" },
  { days: 7, label: "1 week out" },
  { days: 3, label: "3 days out" },
  { days: 2, label: "2 days out" },
  { days: 1, label: "Day before" },
  { days: 0, label: "Departure day" },
];

// Real expected weather: geocode the destination, then average the recorded
// weather for the same dates one year earlier. Fail-soft -- returns null and
// the guide falls back to the traveler's own climate answer.
async function fetchTypicalWeather(destination, depart, ret) {
  try {
    const [place, ...hint] = destination.split(",").map((s) => s.trim()).filter(Boolean);
    if (!place) return null;
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=5&language=en&format=json`, { signal: AbortSignal.timeout(8000) });
    if (!geoRes.ok) return null;
    const results = (await geoRes.json()).results || [];
    if (!results.length) return null;
    const hintText = hint.join(" ").toLowerCase();
    const match = (hintText && results.find((r) => `${r.country || ""} ${r.admin1 || ""} ${r.country_code || ""}`.toLowerCase().includes(hintText))) || results[0];

    const shiftYear = (d) => new Date(Date.UTC(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate()));
    let start = shiftYear(depart);
    let end = shiftYear(ret || depart);
    // The archive only covers the past; step back another year if needed.
    while (end.getTime() > Date.now() - 6 * DAY_MS) {
      start = shiftYear(start);
      end = shiftYear(end);
    }
    const wxRes = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${match.latitude}&longitude=${match.longitude}&start_date=${isoDay(start)}&end_date=${isoDay(end)}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&timezone=auto`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!wxRes.ok) return null;
    const daily = (await wxRes.json()).daily;
    const highs = (daily?.temperature_2m_max || []).filter((n) => typeof n === "number");
    const lows = (daily?.temperature_2m_min || []).filter((n) => typeof n === "number");
    const rain = (daily?.precipitation_sum || []).filter((n) => typeof n === "number");
    if (!highs.length || !lows.length) return null;
    const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
    const rainyDays = rain.filter((n) => n >= 1).length;
    return {
      place: [match.name, match.admin1, match.country].filter(Boolean).join(", "),
      highF: avg(highs),
      lowF: avg(lows),
      rainyDays,
      sampleDays: rain.length || highs.length,
    };
  } catch {
    return null;
  }
}

export async function buildTripFacts(answers) {
  const name = cleanText(answers.customer_name, 40);
  const destination = cleanText(answers.destination, 80);
  const depart = parseISO(answers.departure_date);
  let ret = parseISO(answers.return_date);
  if (depart && ret && ret < depart) ret = null;

  let nights = depart && ret ? Math.round((ret - depart) / DAY_MS) : LENGTH_TO_NIGHTS[answers.trip_length] ?? 6;
  nights = Math.min(Math.max(nights, 1), 45);
  const days = nights + 1;
  if (depart && !ret) ret = new Date(depart.getTime() + nights * DAY_MS);

  const dayDates = depart ? Array.from({ length: Math.min(days, 14) }, (_, i) => fmtShort(new Date(depart.getTime() + i * DAY_MS))) : [];

  // Quantities that must read identically everywhere in the guide.
  const underwear = days <= 7 ? days + 1 : 8;
  const quantities = {
    underwear,
    socks: Math.min(days + 1, 8),
    laundryNote: days > 8 ? "Trip is long enough that one laundry session is built into the plan." : "",
  };

  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const prep = depart
    ? PREP_OFFSETS.map((o) => ({ ...o, date: new Date(depart.getTime() - o.days * DAY_MS) }))
        .filter((o) => o.date >= todayUTC)
        .map((o) => ({ label: o.label, date: fmtShort(o.date) }))
    : [];
  // Departure is closer than the earliest checkpoint: start from today.
  if (depart && prep.length && prep.length < PREP_OFFSETS.length && depart > todayUTC) prep.unshift({ label: "Start today", date: fmtShort(todayUTC) });

  const weather = depart && destination ? await fetchTypicalWeather(destination, depart, ret) : null;

  const activities = Array.isArray(answers.activities) ? answers.activities.map((a) => cleanText(String(a), 40)).filter(Boolean) : [];
  const specialItems = Array.isArray(answers.special_items) ? answers.special_items.map((a) => cleanText(String(a), 40)).filter(Boolean) : [];
  const luggageDetails = cleanText(answers.luggage_details, 100);

  return {
    name, destination, depart, ret, nights, days, dayDates, quantities, prep, weather, activities, specialItems,
    luggage: LUGGAGE_LABEL[answers.luggage_limit] || "",
    luggageDetails,
    climate: cleanText(String(answers.destination_climate || ""), 30),
    weatherNote: cleanText(answers.expected_weather, 100),
  };
}

export function describeTripFacts(f) {
  const lines = ["TRIP FACTS (computed by the system; authoritative -- use them exactly and never contradict them):"];
  if (f.name) lines.push(`Traveler: ${f.name}`);
  if (f.destination) lines.push(`Destination: ${f.destination}`);
  if (f.depart) lines.push(`Departure: ${fmtLong(f.depart)}${f.ret ? `; return: ${fmtLong(f.ret)}` : ""}`);
  lines.push(`Length: ${f.nights} nights / ${f.days} trip days`);
  if (f.dayDates.length) lines.push(`Day dates: ${f.dayDates.map((d, i) => `Day ${i + 1} = ${d}`).join("; ")}`);
  if (f.weather) {
    lines.push(`Expected weather at ${f.weather.place} for these dates (average of recorded weather for the same dates last year): daytime highs about ${f.weather.highF}F, nighttime lows about ${f.weather.lowF}F, rain on roughly ${f.weather.rainyDays} of ${f.weather.sampleDays} days. State it as typical/expected, not a forecast, and tell the reader to check the forecast again 3 days before departure.`);
  } else {
    lines.push(`Weather: no recorded data available. Use the traveler's climate answer (${f.climate || "unspecified"})${f.weatherNote ? ` and their note "${f.weatherNote}"` : ""}. Do NOT invent exact temperatures; give general guidance and tell the reader to check the forecast before packing.`);
  }
  if (f.weatherNote && f.weather) lines.push(`Traveler's own weather note: ${f.weatherNote}`);
  if (f.luggage) lines.push(`Luggage: ${f.luggage}${f.luggageDetails ? ` (traveler says: ${f.luggageDetails})` : ""}`);
  if (f.activities.length) lines.push(`Planned activities: ${f.activities.join(", ")}`);
  if (f.specialItems.length) lines.push(`Special items they are bringing: ${f.specialItems.join(", ")}`);
  lines.push(
    `REQUIRED QUANTITIES (use these exact numbers everywhere they appear, in every section): underwear ${f.quantities.underwear} (one per day plus spares); socks ${f.quantities.socks} pairs.${f.quantities.laundryNote ? ` ${f.quantities.laundryNote}` : ""} Never write a total item count in prose -- the layout computes totals itself.`
  );
  if (f.prep.length) lines.push(`PREPARATION DATES (use these real dates in the timeline, one checkpoint each, verbatim as "when"): ${f.prep.map((p) => `${p.label} = ${p.date}`).join("; ")}`);
  return lines.join("\n");
}

// Authoritative airline / TSA reference the model must follow. Kept in code so
// every guide is generated against the same vetted statements.
export const TRAVEL_RULES = `
AIR TRAVEL RULES (authoritative; follow exactly and always distinguish carry-on from checked):
- Carry-on liquids (TSA 3-1-1): liquids, gels, creams and aerosols must be in containers of 3.4 oz (100 ml) or less, all fitting in ONE clear quart-size bag, one bag per traveler. This limit applies ONLY to carry-on bags. It does NOT apply to checked bags -- never tell the reader to limit checked-bag toiletries to 3.4 oz. For checked bags, recommend leakproof containers sealed in a zip bag; aerosol and flammable-liquid limits still apply.
- Power banks and spare lithium batteries: carry-on ONLY, never checked. Airline limit: up to 100 Wh is allowed; 101-160 Wh needs airline approval (usually max 2); over 160 Wh is not allowed. Most power banks up to about 27,000 mAh are under 100 Wh. Devices with installed batteries should also travel in the carry-on.
- Knives, multi-tools with blades, and loose razor blades: checked bag ONLY (prohibited in carry-on). Sheath/wrap them.
- Camp stoves: only if completely empty, cleaned and free of fuel residue or odor; fuel canisters and liquid fuel are prohibited in both carry-on and checked bags. Recommend buying fuel at the destination and verifying with the airline and TSA first.
- Valuables, medication, jewelry, travel documents, keys and electronics belong in the carry-on or personal item, not the checked bag.
- Prescription medication: carry-on, in original labeled containers. Medically necessary liquids are allowed over 3.4 oz but must be declared at the checkpoint.
- Typical limits (always say "typically" and tell the reader to confirm with their airline): checked bag about 50 lb (23 kg) for economy; carry-on about 22 x 14 x 9 in; personal item must fit under the seat. A luggage scale prevents overweight fees.
- Rules change. Always include a short reminder to confirm current rules on tsa.gov and the airline's website before travel.
`.trim();

// Quantities must be identical everywhere; force the staples to the computed
// numbers inside any packing_list block regardless of what the model wrote.
export function normalizeTripBlocks(blocks, facts) {
  const { underwear, socks } = facts.quantities;
  for (const b of blocks) {
    if (b.type !== "packing_list") continue;
    for (const cat of b.categories) {
      for (const item of cat.items) {
        if (/\b(underwear|panties|briefs|knickers|boxers)\b/i.test(item.name)) item.qty = underwear;
        else if (/\bsocks?\b/i.test(item.name) && !/compression|hiking|ski/i.test(item.name)) item.qty = socks;
      }
    }
  }
  return blocks;
}

export function buildCoverMeta(facts, baseTitle) {
  const destination = facts.destination;
  const title = destination ? `${destination} Travel Plan` : baseTitle;
  const parts = [];
  if (facts.depart) parts.push(`${fmtShort(facts.depart)}${facts.ret ? ` - ${fmtLong(facts.ret)}` : ""}`);
  parts.push(`${facts.nights} nights`);
  return {
    title,
    subtitle: "Your personalized packing and preparation guide",
    preparedFor: facts.name ? `Prepared for ${facts.name}` : "",
    details: parts.join("  |  "),
  };
}

export const TRAVEL_SLUG = "travel-lifestyle";
