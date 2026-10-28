import test from "node:test";
import assert from "node:assert/strict";
import { buildTripFacts, normalizeTripBlocks, describeTripFacts } from "../lib/travel.js";
import { findIssues } from "../lib/qc.js";

// Destination is left empty so no weather request is made.
const answers = (over = {}) => ({ customer_name: "Nicole", destination: "", departure_date: "2030-03-10", return_date: "2030-03-16", special_items: [], activities: [], luggage_limit: "one_checked", ...over });

test("trip length and underwear follow the dates (7 days -> 8 pairs)", async () => {
  const f = await buildTripFacts(answers());
  assert.equal(f.nights, 6);
  assert.equal(f.days, 7);
  assert.equal(f.quantities.underwear, 8);
});

test("preparation dates are counted back from departure", async () => {
  const f = await buildTripFacts(answers({ departure_date: "2030-03-20", return_date: "2030-03-25" }));
  const week = f.prep.find((p) => p.label === "1 week out");
  assert.ok(week.date.includes("Mar 13"));
});

test("packing_list staples are forced to the computed quantities", async () => {
  const f = await buildTripFacts(answers());
  const blocks = [{ type: "packing_list", title: "x", categories: [{ name: "Basics", items: [{ name: "Underwear", qty: 7, note: "" }, { name: "Socks", qty: 3, note: "" }, { name: "Tee", qty: 3, note: "" }] }] }];
  const [out] = normalizeTripBlocks(blocks, f);
  assert.deepEqual(out.categories[0].items.map((i) => i.qty), [8, 8, 3]);
});

test("stove and multi-tool rows are removed unless the traveler listed them", async () => {
  const table = { type: "table", title: "Gear", columns: ["Item", "Bag"], rows: [["Camp stove", "Checked"], ["Multi-tool", "Checked"], ["Rain jacket", "Carry-on"]] };
  const none = normalizeTripBlocks([table], await buildTripFacts(answers()))[0];
  assert.deepEqual(none.rows.map((r) => r[0]), ["Rain jacket"]);
  const listed = normalizeTripBlocks([table], await buildTripFacts(answers({ special_items: ["camp_stove", "multi_tool"] })))[0];
  assert.equal(listed.rows.length, 3);
});

test("QC flags wrong-bag rules and keeps correct statements", async () => {
  const f = await buildTripFacts(answers());
  const bad = [
    { type: "paragraph", text: "Keep every bottle in your checked bag under 3.4 oz so it passes security." },
    { type: "paragraph", text: "Pack your power bank in your checked luggage to save space." },
    { type: "paragraph", text: "Put your jewelry in the checked bag for safekeeping on the flight." },
    { type: "paragraph", text: "You will bring 25 items in total for this trip." },
  ];
  assert.equal(findIssues(bad, f).length, 4);
  const good = [
    { type: "paragraph", text: "Liquids in your carry-on must be 3.4 oz or less and fit in one quart bag." },
    { type: "paragraph", text: "Power banks must travel in your carry-on, never in checked luggage." },
  ];
  assert.equal(findIssues(good, f).length, 0);
});

test("facts text carries the required quantities and dates", async () => {
  const text = describeTripFacts(await buildTripFacts(answers()));
  assert.match(text, /underwear 8/);
  assert.match(text, /Traveler: Nicole/);
});
