// Magazine-style guide renderer (burgundy / cream / gold editorial look).
// Same input as the legacy renderer in lib/pdf.js, built on @react-pdf/renderer
// so we get real fonts, rounded cards, gradients and SVG icons.
//
// Written with React.createElement (no JSX) so it also runs in plain node
// scripts and tests.
import React from "react";
import path from "path";
import fs from "fs";
import { Document, Page, View, Text, Image, Link, Svg, Path, Rect, Circle, Line, Defs, LinearGradient, Stop, Font, renderToBuffer } from "@react-pdf/renderer";

const h = React.createElement;

const C = {
  burgundy: "#6D1F3C",
  deep: "#43102A",
  rose: "#B83A62",
  pink: "#E4508C",
  blush: "#F8E9ED",
  blush2: "#F1D7DE",
  cream: "#FBF6F0",
  gold: "#C8A15A",
  ink: "#2B141C",
  body: "#4A2E37",
  muted: "#8A6B74",
  line: "#E9D5DA",
  white: "#FFFFFF",
  warn: "#FBEAE6",
  warnLine: "#C4543F",
  note: "#F4EFEA",
  noteLine: "#9C8A82",
};

const SERIF = "Playfair";
const SANS = "Inter";
const SCRIPT = "Script";
const PAGE_W = 612;
const PAGE_H = 792;
const PAD = 40;

// ── Fonts & assets ───────────────────────────────────────────────────────

let fontsReady = false;
function fontPath(name) {
  return path.join(process.cwd(), "public", "fonts", name);
}
function registerFonts() {
  if (fontsReady) return;
  Font.register({
    family: SERIF,
    fonts: [
      { src: fontPath("playfair-display-latin-400-normal.woff"), fontWeight: 400 },
      { src: fontPath("playfair-display-latin-700-normal.woff"), fontWeight: 700 },
      { src: fontPath("playfair-display-latin-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
      { src: fontPath("playfair-display-latin-600-italic.woff"), fontWeight: 700, fontStyle: "italic" },
    ],
  });
  Font.register({
    family: SANS,
    fonts: [
      { src: fontPath("inter-latin-400-normal.woff"), fontWeight: 400 },
      { src: fontPath("inter-latin-500-normal.woff"), fontWeight: 500 },
      { src: fontPath("inter-latin-600-normal.woff"), fontWeight: 600 },
      { src: fontPath("inter-latin-700-normal.woff"), fontWeight: 700 },
      { src: fontPath("inter-latin-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
      { src: fontPath("inter-latin-400-italic.woff"), fontWeight: 700, fontStyle: "italic" },
    ],
  });
  Font.register({ family: SCRIPT, src: fontPath("dancing-script-latin-700-normal.woff") });
  Font.registerHyphenationCallback((w) => [w]);
  fontsReady = true;
}

const assetCache = {};
function quinnAsset(name) {
  if (assetCache[name] === undefined) {
    try {
      assetCache[name] = fs.readFileSync(path.join(process.cwd(), "public", "quinn", name));
    } catch {
      assetCache[name] = null;
    }
  }
  return assetCache[name];
}

function imgSrc(bytes) {
  if (!bytes) return null;
  const data = Buffer.from(bytes);
  const isPng = data[0] === 0x89 && data[1] === 0x50;
  const isJpg = data[0] === 0xff && data[1] === 0xd8;
  if (!isPng && !isJpg) return null;
  return { data, format: isPng ? "png" : "jpg" };
}

// Keep only characters the bundled Latin fonts can draw.
function clean(text) {
  return String(text ?? "")
    .replace(/[→⟶➔➜]/g, "›")
    .replace(/[≈≅]/g, "~")
    .replace(/[✓✔]/g, "")
    .replace(/[^\n -~ -ɏ‐-‧‰-›€™]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// ── Small building blocks ────────────────────────────────────────────────

const T = (style, children, props = {}) => h(Text, { style: { fontFamily: SANS, fontSize: 10, color: C.body, ...style }, ...props }, typeof children === "string" ? clean(children) : children);
const V = (style, ...children) => h(View, { style }, ...children);

function Icon({ name, size = 18, color = C.burgundy }) {
  const p = { stroke: color, strokeWidth: 1.8, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  const shapes = {
    calendar: [h(Rect, { key: 1, x: 3, y: 4, width: 18, height: 18, rx: 2, ...p }), h(Path, { key: 2, d: "M16 2v4M8 2v4M3 10h18", ...p })],
    thermo: [h(Path, { key: 1, d: "M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z", ...p })],
    bag: [h(Rect, { key: 1, x: 2, y: 7, width: 20, height: 14, rx: 2, ...p }), h(Path, { key: 2, d: "M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16", ...p })],
    pin: [h(Path, { key: 1, d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z", ...p }), h(Circle, { key: 2, cx: 12, cy: 10, r: 3, ...p })],
    clock: [h(Circle, { key: 1, cx: 12, cy: 12, r: 10, ...p }), h(Path, { key: 2, d: "M12 6v6l4 2", ...p })],
    check: [h(Path, { key: 1, d: "M20 6 9 17l-5-5", ...p })],
    plane: [h(Path, { key: 1, d: "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z", ...p })],
    star: [h(Path, { key: 1, d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", ...p })],
    drop: [h(Path, { key: 1, d: "M12 2.7c3.5 4 6 7 6 10.3a6 6 0 0 1-12 0C6 9.7 8.5 6.7 12 2.7z", ...p })],
    sun: [h(Circle, { key: 1, cx: 12, cy: 12, r: 4, ...p }), h(Path, { key: 2, d: "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4", ...p })],
    heart: [h(Path, { key: 1, d: "M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z", ...p })],
  };
  return h(Svg, { width: size, height: size, viewBox: "0 0 24 24" }, ...(shapes[name] || shapes.star));
}

function iconFor(label = "") {
  const l = label.toLowerCase();
  if (/night|day|date|week|month|stay/.test(l)) return "calendar";
  if (/temp|weather|climate|°|forecast|cold|warm/.test(l)) return "thermo";
  if (/bag|luggage|limit|carry|weight|kg|lb/.test(l)) return "bag";
  if (/destination|city|place|location|trip/.test(l)) return "pin";
  if (/hour|time|flight|minute/.test(l)) return "clock";
  if (/water|drink|liquid|hydrat/.test(l)) return "drop";
  if (/sun|uv|spf/.test(l)) return "sun";
  return "star";
}

function Checkbox({ size = 9 }) {
  return V({ width: size, height: size, borderWidth: 1.1, borderColor: C.rose, borderRadius: 2, backgroundColor: C.white, flexShrink: 0 });
}

function Eyebrow({ children, color = C.rose }) {
  return T({ fontSize: 7.5, fontWeight: 700, letterSpacing: 1.4, color }, String(children).toUpperCase());
}

function BlockTitle({ children }) {
  if (!children) return null;
  return V({ marginBottom: 7, marginTop: 4 }, T({ fontFamily: SERIF, fontWeight: 700, fontSize: 13, color: C.burgundy }, children), V({ width: 28, height: 2, backgroundColor: C.gold, marginTop: 3 }));
}

function Card({ children, style = {}, ...props }) {
  return h(View, { style: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 8, ...style }, ...props }, children);
}

function Avatar({ size = 34 }) {
  const src = imgSrc(quinnAsset("avatar.jpg"));
  if (!src) return V({ width: size, height: size, borderRadius: size / 2, backgroundColor: C.burgundy });
  return h(Image, { src, style: { width: size, height: size, borderRadius: size / 2, objectFit: "cover" } });
}

// ── Block renderers ──────────────────────────────────────────────────────

function Paragraph({ block }) {
  return T({ fontSize: 10.5, lineHeight: 1.55, marginBottom: 9 }, block.text);
}

function Steps({ block }) {
  return V({ marginBottom: 10 },
    h(BlockTitle, null, block.title),
    ...block.steps.map((step, i) =>
      h(View, { key: i, wrap: false, style: { flexDirection: "row", marginBottom: 6 } },
        V({ width: 20, height: 20, borderRadius: 10, backgroundColor: C.burgundy, alignItems: "center", justifyContent: "center", marginRight: 9, marginTop: 1 }, T({ color: C.white, fontWeight: 700, fontSize: 9 }, String(i + 1))),
        T({ flex: 1, lineHeight: 1.5, fontSize: 10.5 }, step))
    ));
}

function Checklist({ block }) {
  const two = block.items.length > 6;
  return h(Card, { style: { padding: 10, marginBottom: 10 } },
    block.title ? V({ marginBottom: 6 }, h(Eyebrow, null, block.title)) : null,
    V({ flexDirection: "row", flexWrap: "wrap" },
      ...block.items.map((it, i) =>
        h(View, { key: i, wrap: false, style: { width: two ? "50%" : "100%", flexDirection: "row", paddingRight: 8, marginBottom: 5 } },
          V({ marginTop: 1.5, marginRight: 7 }, h(Checkbox)), T({ flex: 1, fontSize: 10, lineHeight: 1.4 }, it)))));
}

function Table({ block }) {
  const cols = block.columns;
  const cb = block.checkbox;
  const cell = (txt, ci, head) => T({ flex: 1, paddingHorizontal: 6, fontSize: head ? 8.5 : 9.5, fontWeight: head ? 700 : 400, color: head ? C.white : C.body, lineHeight: 1.4, textTransform: head ? "uppercase" : "none", letterSpacing: head ? 0.6 : 0 }, txt);
  return V({ marginBottom: 12 },
    h(BlockTitle, null, block.title),
    h(View, { style: { borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: C.line } },
      h(View, { wrap: false, style: { flexDirection: "row", backgroundColor: C.burgundy, paddingVertical: 7, paddingHorizontal: 4 } },
        cb ? V({ width: 22 }) : null, ...cols.map((c, i) => h(React.Fragment, { key: i }, cell(c, i, true)))),
      ...block.rows.map((row, ri) =>
        h(View, { key: ri, wrap: false, style: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 4, backgroundColor: ri % 2 ? C.blush : C.white, alignItems: "flex-start" } },
          cb ? V({ width: 22, paddingLeft: 6, paddingTop: 1 }, h(Checkbox)) : null,
          ...row.map((c, i) => h(React.Fragment, { key: i }, cell(c, i, false)))))));
}

function Callout({ block }) {
  if (block.tone === "tip") {
    return h(View, { wrap: false, style: { flexDirection: "row", alignItems: "center", backgroundColor: C.burgundy, borderRadius: 10, padding: 11, marginBottom: 12 } },
      V({ marginRight: 11, borderWidth: 2, borderColor: C.gold, borderRadius: 20 }, h(Avatar, { size: 34 })),
      V({ flex: 1 },
        T({ fontFamily: SCRIPT, fontSize: 15, color: C.gold, marginBottom: 1 }, "Quinn's Tip"),
        T({ color: C.white, fontSize: 10, lineHeight: 1.5 }, block.text)));
  }
  const warn = block.tone === "warning";
  return h(View, { wrap: false, style: { backgroundColor: warn ? C.warn : C.note, borderLeftWidth: 3, borderLeftColor: warn ? C.warnLine : C.noteLine, borderRadius: 6, padding: 10, marginBottom: 12 } },
    V({ flexDirection: "row", alignItems: "center", marginBottom: 3 }, h(Eyebrow, { color: warn ? C.warnLine : C.muted }, warn ? "Important" : "Note")),
    T({ fontSize: 10, lineHeight: 1.5 }, block.text));
}

function Comparison({ block }) {
  return V({ marginBottom: 12 },
    h(BlockTitle, null, block.title),
    h(View, { wrap: false, style: { flexDirection: "row" } },
      ...block.options.map((o, i) =>
        h(Card, { key: i, style: { flex: 1, padding: 10, marginRight: i < block.options.length - 1 ? 10 : 0 } },
          T({ fontFamily: SERIF, fontWeight: 700, fontSize: 11.5, color: C.rose, marginBottom: 5 }, o.label),
          ...o.pros.map((p, k) => h(View, { key: k, style: { flexDirection: "row", marginBottom: 3 } }, T({ color: C.gold, marginRight: 5, fontSize: 10 }, "•"), T({ flex: 1, fontSize: 9.5, lineHeight: 1.4 }, p))),
          o.notes ? T({ fontStyle: "italic", color: C.muted, fontSize: 9, marginTop: 4, lineHeight: 1.4 }, o.notes) : null))));
}

function Recipe({ block }) {
  const src = imgSrc(block.imageBytes);
  return h(Card, { wrap: false, style: { padding: 12, marginBottom: 12 } },
    T({ fontFamily: SERIF, fontWeight: 700, fontSize: 14, color: C.rose, marginBottom: 7 }, block.name),
    h(View, { style: { flexDirection: "row" } },
      src ? h(Image, { src, style: { width: 150, height: 112, borderRadius: 7, objectFit: "cover", marginRight: 12 } }) : null,
      V({ flex: 1 },
        h(Eyebrow, null, block.servings ? `Ingredients  /  ${block.servings}` : "Ingredients"),
        T({ fontSize: 9.5, lineHeight: 1.5, marginTop: 3 }, (block.ingredients || []).join("; ") + (block.ingredients?.length ? "." : "")))),
    V({ marginTop: 8 }, h(Eyebrow, null, "How to prepare"), T({ fontSize: 9.5, lineHeight: 1.55, marginTop: 3 }, block.instructions || "")),
    block.swap ? T({ fontStyle: "italic", color: C.muted, fontSize: 9, marginTop: 6 }, `Swap option: ${block.swap}`) : null);
}

function Arrow() {
  return h(Svg, { width: 16, height: 10, viewBox: "0 0 16 10" }, h(Path, { d: "M1 5h12M9 1l4 4-4 4", stroke: C.rose, strokeWidth: 1.6, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }));
}

function Flow({ block }) {
  const rows = [];
  for (let i = 0; i < block.steps.length; i += 3) rows.push(block.steps.slice(i, i + 3));
  let n = 0;
  return V({ marginBottom: 12 },
    h(BlockTitle, null, block.title),
    ...rows.map((row, ri) =>
      h(View, { key: ri, wrap: false, style: { flexDirection: "row", alignItems: "stretch", marginBottom: 8 } },
        ...row.map((s, i) => {
          n += 1;
          return h(React.Fragment, { key: i },
            h(Card, { style: { flex: 1, padding: 8, backgroundColor: C.blush, borderColor: C.blush2 } },
              V({ flexDirection: "row", alignItems: "center", marginBottom: 3 },
                V({ width: 15, height: 15, borderRadius: 8, backgroundColor: C.burgundy, alignItems: "center", justifyContent: "center", marginRight: 6 }, T({ color: C.white, fontSize: 7.5, fontWeight: 700 }, String(n))),
                T({ flex: 1, fontWeight: 700, fontSize: 9.5, color: C.ink, lineHeight: 1.3 }, s.label)),
              s.detail ? T({ fontSize: 8.5, lineHeight: 1.4 }, s.detail) : null),
            i < row.length - 1 ? V({ width: 22, alignItems: "center", justifyContent: "center" }, h(Arrow)) : null);
        }))));
}

function Timeline({ block }) {
  return V({ marginBottom: 12 },
    h(BlockTitle, null, block.title),
    ...block.events.map((e, i) =>
      h(View, { key: i, wrap: false, style: { flexDirection: "row", minHeight: 38 } },
        V({ width: 78, alignItems: "flex-end", paddingRight: 8, paddingTop: 1 }, T({ fontWeight: 700, fontSize: 9, color: C.rose, textAlign: "right", lineHeight: 1.3 }, e.when || "")),
        V({ width: 16, alignItems: "center" },
          i < block.events.length - 1 ? V({ position: "absolute", top: 8, bottom: -2, left: 7, width: 1.5, backgroundColor: C.blush2 }) : null,
          V({ width: 11, height: 11, borderRadius: 6, backgroundColor: C.burgundy, borderWidth: 2, borderColor: C.cream, marginTop: 2 })),
        V({ flex: 1, paddingLeft: 8, paddingBottom: 9 },
          T({ fontWeight: 700, fontSize: 10.5, color: C.ink, lineHeight: 1.35 }, e.label),
          e.detail ? T({ fontSize: 9.5, lineHeight: 1.45, marginTop: 1 }, e.detail) : null,
          ...(e.tasks || []).map((t, k) => h(View, { key: k, style: { flexDirection: "row", marginTop: 3 } }, V({ marginRight: 6, marginTop: 1.5 }, h(Checkbox, { size: 8 })), T({ flex: 1, fontSize: 9.5, lineHeight: 1.4 }, t)))))));
}

function Stats({ block }) {
  return V({ marginBottom: 12 },
    h(BlockTitle, null, block.title),
    h(View, { wrap: false, style: { flexDirection: "row" } },
      ...block.items.map((it, i) => {
        const long = String(it.value).length > 9;
        return h(View, { key: i, style: { flex: 1, marginRight: i < block.items.length - 1 ? 8 : 0, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderTopWidth: 3, borderTopColor: C.gold, borderRadius: 8, padding: 9, alignItems: "center" } },
          V({ width: 28, height: 28, borderRadius: 14, backgroundColor: C.blush, alignItems: "center", justifyContent: "center", marginBottom: 5 }, h(Icon, { name: iconFor(`${it.label} ${it.value}`), size: 15 })),
          T({ fontFamily: SERIF, fontWeight: 700, fontSize: long ? 11 : 16, color: C.burgundy, textAlign: "center", lineHeight: 1.2 }, it.value),
          T({ fontSize: 8, color: C.muted, textAlign: "center", marginTop: 2, lineHeight: 1.3 }, it.label));
      })));
}

const TIERS = {
  budget: { label: "Everyday pick", bg: C.blush2, fg: C.burgundy },
  premium: { label: "Premium pick", bg: C.gold, fg: C.deep },
  luxury: { label: "Luxury pick", bg: C.burgundy, fg: C.white },
};

function ProductCard({ p, num }) {
  const src = imgSrc(p.imageBytes);
  const tier = p.curated ? TIERS[p.tier] : null;
  const fields = [];
  if (p.curated && p.description) fields.push([null, p.description, false]);
  if (p.spec) fields.push([null, p.spec, true]);
  if (p.benefit) fields.push([p.curated ? "Why Quinn picked it" : null, p.benefit, false]);
  if (p.config) fields.push(["What to buy", p.config, false]);
  if (p.fit) fields.push(["Why it suits you", p.fit, false]);
  if (p.alternative) fields.push(["Alternative", p.alternative, false]);
  const btn = h(Link, { src: p.url, style: { textDecoration: "none" } },
    V({ backgroundColor: C.burgundy, borderRadius: 5, paddingVertical: 6, alignItems: "center" }, T({ color: C.white, fontWeight: 700, fontSize: 8, letterSpacing: 1 }, p.curated ? "VIEW ON AMAZON  ›" : "SEARCH ON AMAZON  ›")));
  return h(Card, { style: { flexGrow: 1, overflow: "hidden" } },
    V({ height: 118, backgroundColor: C.white, alignItems: "center", justifyContent: "center", padding: 8, borderBottomWidth: 1, borderBottomColor: C.line },
      src ? h(Link, { src: p.url }, h(Image, { src, style: { height: 100, maxWidth: 190, objectFit: "contain" } })) : T({ fontFamily: SERIF, fontSize: 26, color: C.blush2 }, String(num).padStart(2, "0")),
      tier ? V({ position: "absolute", top: 6, left: 6, backgroundColor: tier.bg, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 }, T({ color: tier.fg, fontSize: 6.5, fontWeight: 700, letterSpacing: 0.8 }, tier.label.toUpperCase())) : null),
    V({ padding: 10, flexGrow: 1 },
      p.brand ? T({ fontSize: 7.5, fontWeight: 700, letterSpacing: 1, color: C.muted }, String(p.brand).toUpperCase().slice(0, 40)) : null,
      T({ fontFamily: SERIF, fontWeight: 700, fontSize: 11, color: C.ink, lineHeight: 1.3, marginTop: 1 }, p.name),
      p.curated && p.priceRange ? T({ fontWeight: 700, color: C.rose, fontSize: 10, marginTop: 3 }, p.priceRange) : null,
      ...fields.map(([label, text, bold], i) =>
        h(Text, { key: i, style: { fontFamily: SANS, fontSize: 8.5, lineHeight: 1.45, marginTop: 4, color: C.body, fontWeight: bold ? 700 : 400 } },
          label ? h(Text, { style: { fontWeight: 700, color: C.burgundy } }, `${clean(label)}: `) : null, clean(text))),
      V({ flexGrow: 1, minHeight: 6 }),
      V({ marginTop: 7 }, btn)));
}

function ProductPicks({ block, state }) {
  const rows = [];
  for (let i = 0; i < block.products.length; i += 2) rows.push(block.products.slice(i, i + 2).map((p, k) => ({ p, n: i + k + 1 })));
  const showNote = !state.shopNote;
  state.shopNote = true;
  const renderRow = (row, ri) =>
    h(View, { key: ri, wrap: false, style: { flexDirection: "row", alignItems: "stretch", marginBottom: 9 } },
      ...row.map(({ p, n }, i) => h(View, { key: i, style: { width: "49%", marginRight: i === 0 && row.length > 1 ? "2%" : 0, flexDirection: "column" } }, h(ProductCard, { p, num: n }))));
  // Heading and the first row of cards stay together so a heading is never stranded at the foot of a page.
  return V({ marginBottom: 6 },
    h(View, { wrap: false },
      V({ marginTop: 4, marginBottom: 8 },
        T({ fontFamily: SERIF, fontWeight: 700, fontSize: 15, color: C.burgundy, letterSpacing: 0.5 }, String(block.heading).toUpperCase()),
        V({ width: 36, height: 2, backgroundColor: C.gold, marginVertical: 4 }),
        block.subtitle ? T({ fontStyle: "italic", color: C.muted, fontSize: 9.5 }, block.subtitle) : null),
      rows[0] ? renderRow(rows[0], 0) : null),
    ...rows.slice(1).map((row, ri) => renderRow(row, ri + 1)),
    showNote ? T({ fontStyle: "italic", color: C.muted, fontSize: 8, lineHeight: 1.4, marginBottom: 8 }, "SEARCH ON AMAZON opens a filtered Amazon search for that product type; VIEW ON AMAZON opens one specific recommended product. As an Amazon Associate, Body By Quinn earns from qualifying purchases. Prices and availability change.") : null,
    block.tip ? h(Callout, { block: { tone: "tip", text: block.tip } }) : null);
}

function PackingList({ block }) {
  let total = 0;
  const cards = block.categories.map((cat, ci) => {
    cat.items.forEach((it) => { total += Number(it.qty) || 0; });
    return h(View, { key: ci, wrap: false, style: { marginBottom: 9, borderWidth: 1, borderColor: C.line, borderRadius: 8, overflow: "hidden", backgroundColor: C.white } },
      V({ backgroundColor: C.blush, paddingVertical: 5, paddingHorizontal: 8, flexDirection: "row", justifyContent: "space-between" }, h(Eyebrow, { color: C.burgundy }, cat.name), T({ fontSize: 7, color: C.muted, fontWeight: 700, letterSpacing: 1 }, "QTY")),
      ...cat.items.map((it, i) =>
        h(View, { key: i, style: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line, alignItems: "flex-start" } },
          V({ marginRight: 7, marginTop: 1.5 }, h(Checkbox)),
          V({ flex: 1 }, T({ fontSize: 9.5, color: C.ink, lineHeight: 1.35 }, it.name), it.note ? T({ fontSize: 8, fontStyle: "italic", color: C.muted, lineHeight: 1.35 }, it.note) : null),
          T({ fontWeight: 700, color: C.rose, fontSize: 9.5, marginLeft: 6 }, `x${it.qty}`))));
  });
  const left = cards.filter((_, i) => i % 2 === 0);
  const right = cards.filter((_, i) => i % 2 === 1);
  return V({ marginBottom: 12 },
    h(BlockTitle, null, block.title),
    h(View, { style: { flexDirection: "row" } }, V({ flex: 1, marginRight: 9 }, ...left), V({ flex: 1 }, ...right)),
    h(View, { wrap: false, style: { backgroundColor: C.deep, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" } },
      T({ color: C.white, fontWeight: 700, fontSize: 8.5, letterSpacing: 1.2 }, "TOTAL ITEMS TO PACK"),
      T({ fontFamily: SERIF, fontWeight: 700, color: C.gold, fontSize: 16 }, String(total))));
}

const TINTS = ["#FCEFF2", "#F7DDE5", "#FDF1E3", "#EFE6F3", "#E9F3EA", "#FBE7E2"];

function Badge({ n }) {
  return V({ width: 15, height: 15, borderRadius: 8, backgroundColor: C.burgundy, alignItems: "center", justifyContent: "center" }, T({ color: C.white, fontSize: 7.5, fontWeight: 700 }, String(n)));
}

function PackDiagram({ block }) {
  const zones = block.zones;
  const legend = h(View, { style: { flex: 1, paddingLeft: 16 } },
    ...zones.map((z, i) => h(View, { key: i, style: { flexDirection: "row", marginBottom: 7 } },
      h(Badge, { n: i + 1 }),
      V({ flex: 1, marginLeft: 7 }, T({ fontWeight: 700, color: C.ink, fontSize: 9.5 }, z.label + (block.variant === "cubes" && z.size ? ` (${z.size})` : "")), T({ fontSize: 9, lineHeight: 1.4 }, z.contents)))));
  let diagram;
  if (block.variant === "cubes") {
    const dims = { small: [66, 58], medium: [92, 72], large: [124, 88] };
    diagram = V({ width: 270, flexDirection: "row", flexWrap: "wrap" },
      ...zones.map((z, i) => {
        const [w, hh] = dims[z.size] || dims.medium;
        return V({ key: i, width: w, height: hh, marginRight: 9, marginBottom: 9, backgroundColor: TINTS[i % TINTS.length], borderWidth: 1.5, borderColor: C.rose, borderRadius: 7, alignItems: "center", justifyContent: "center", padding: 4 },
          V({ position: "absolute", top: 4, left: 4 }, h(Badge, { n: i + 1 })),
          V({ position: "absolute", top: -1, width: 16, height: 5, backgroundColor: C.rose, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }),
          T({ fontWeight: 700, fontSize: 8, textAlign: "center", color: C.ink, marginTop: 8 }, z.label));
      }));
  } else {
    diagram = V({ width: 270 },
      V({ alignSelf: "center", width: 50, height: 9, backgroundColor: C.muted, borderTopLeftRadius: 5, borderTopRightRadius: 5 }),
      V({ borderWidth: 3, borderColor: C.rose, borderRadius: 14, backgroundColor: C.blush, padding: 9 },
        V({ backgroundColor: C.white, borderRadius: 8, padding: 5, flexDirection: "row", flexWrap: "wrap" },
          ...zones.map((z, i) => V({ key: i, width: zones.length <= 2 ? "98%" : "48%", margin: "1%", minHeight: 58, backgroundColor: TINTS[i % TINTS.length], borderWidth: 1, borderStyle: "dashed", borderColor: C.rose, borderRadius: 6, alignItems: "center", justifyContent: "center", padding: 4 },
            V({ position: "absolute", top: 4, left: 4 }, h(Badge, { n: i + 1 })),
            T({ fontWeight: 700, fontSize: 8.5, textAlign: "center", color: C.ink, marginTop: 6 }, z.label))))));
  }
  return V({ marginBottom: 12 },
    h(BlockTitle, null, block.title),
    h(View, { wrap: false, style: { flexDirection: "row", alignItems: "flex-start" } }, diagram, legend),
    block.caption ? T({ fontStyle: "italic", color: C.muted, fontSize: 9, marginTop: 4 }, block.caption) : null);
}

function ImageBlock({ block }) {
  const src = imgSrc(block.bytes);
  if (!src) return null;
  return V({ marginBottom: 12 }, h(Image, { src, style: { width: "100%", maxHeight: 230, objectFit: "cover", borderRadius: 8 } }), block.caption ? T({ fontStyle: "italic", color: C.muted, fontSize: 9, textAlign: "center", marginTop: 4 }, block.caption) : null);
}

function Block({ block, state }) {
  switch (block.type) {
    case "paragraph": return h(Paragraph, { block });
    case "numbered_steps": return h(Steps, { block });
    case "checklist": return h(Checklist, { block });
    case "table": return h(Table, { block });
    case "callout": return h(Callout, { block });
    case "comparison": return h(Comparison, { block });
    case "recipe": return h(Recipe, { block });
    case "flow": return h(Flow, { block });
    case "timeline": return h(Timeline, { block });
    case "stats": return h(Stats, { block });
    case "product_picks": return h(ProductPicks, { block, state });
    case "packing_list": return h(PackingList, { block });
    case "pack_diagram": return h(PackDiagram, { block });
    case "image": return h(ImageBlock, { block });
    default: return null;
  }
}

// ── Pages ────────────────────────────────────────────────────────────────

function Footer({ guideTitle }) {
  return h(View, { fixed: true, style: { position: "absolute", bottom: 16, left: PAD, right: PAD, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 0.75, borderTopColor: C.line, paddingTop: 6 } },
    T({ fontSize: 7, fontWeight: 700, letterSpacing: 1.2, color: C.gold }, `BODY BY QUINN   ·   ${clean(guideTitle).toUpperCase()}`),
    h(Text, { style: { fontFamily: SANS, fontSize: 8, color: C.muted }, render: ({ pageNumber }) => String(pageNumber) }));
}

function Cover({ title, categoryName, objectives, durationLabel, coverImageBytes, cover, sections = [] }) {
  // Short highlight pills: section names read better here than long objectives.
  const pills = sections.map((s) => s.title).filter((t) => t && t.length <= 28).slice(0, 4);
  const hero = imgSrc(coverImageBytes) || (/fit|workout|strength/i.test(categoryName || "") ? imgSrc(quinnAsset("workout.jpg")) : null);
  const words = clean(title).split(/\s+/);
  const dest = cover?.subtitle || null;
  return h(Page, { size: [PAGE_W, PAGE_H], style: { backgroundColor: C.deep } },
    hero ? h(Image, { src: hero, style: { position: "absolute", top: 0, left: 0, width: PAGE_W, height: PAGE_H, objectFit: "cover" } }) : null,
    h(Svg, { width: PAGE_W, height: PAGE_H, style: { position: "absolute", top: 0, left: 0 } },
      h(Defs, null, h(LinearGradient, { id: "cg", x1: "0", y1: "0", x2: "0", y2: "1" },
        h(Stop, { offset: "0", stopColor: C.deep, stopOpacity: hero ? 0.85 : 1 }),
        h(Stop, { offset: "0.42", stopColor: C.deep, stopOpacity: hero ? 0.2 : 1 }),
        h(Stop, { offset: "0.72", stopColor: C.deep, stopOpacity: hero ? 0.55 : 1 }),
        h(Stop, { offset: "1", stopColor: C.deep, stopOpacity: 0.96 }))),
      h(Rect, { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: "url(#cg)" })),
    V({ position: "absolute", top: 0, left: 0, right: 0, height: 8, backgroundColor: C.gold }),
    V({ position: "absolute", top: 40, left: 0, right: 0, alignItems: "center" },
      T({ fontFamily: SERIF, fontWeight: 700, fontSize: 15, color: C.white, letterSpacing: 4 }, "BODY BY QUINN"),
      T({ fontSize: 7.5, fontWeight: 600, color: C.gold, letterSpacing: 3, marginTop: 5 }, String(categoryName || "Personalized guide").toUpperCase())),
    V({ position: "absolute", top: 118, left: 44, right: 44, alignItems: "center" },
      T({ fontFamily: SERIF, fontWeight: 700, fontSize: words.length > 4 ? 30 : 38, color: C.white, textAlign: "center", lineHeight: 1.15, letterSpacing: 1 }, clean(cover?.title || title).toUpperCase()),
      dest && dest.length <= 26 ? T({ fontFamily: SCRIPT, fontSize: 40, color: C.white, textAlign: "center", marginTop: 4 }, dest) : null,
      dest && dest.length > 26 ? T({ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: C.white, textAlign: "center", marginTop: 10, lineHeight: 1.4 }, dest) : null),
    V({ position: "absolute", bottom: 150, left: 44, right: 44, alignItems: "center" },
      cover?.details ? V({ backgroundColor: C.rose, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 16, marginBottom: 8 }, T({ color: C.white, fontWeight: 700, fontSize: 10, letterSpacing: 1.2 }, cover.details)) : (durationLabel ? V({ backgroundColor: C.rose, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 16, marginBottom: 8 }, T({ color: C.white, fontWeight: 700, fontSize: 10, letterSpacing: 1.2 }, durationLabel)) : null),
      cover?.preparedFor ? T({ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: C.white, textAlign: "center", marginTop: 2 }, cover.preparedFor) : null),
    V({ position: "absolute", bottom: 40, left: 44, right: 44 },
      pills.length ? V({ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginBottom: 12 }, ...pills.map((o, i) => V({ key: i, borderWidth: 1, borderColor: C.gold, borderRadius: 12, paddingVertical: 3, paddingHorizontal: 9, margin: 3 }, T({ color: C.white, fontSize: 8, fontWeight: 500 }, o)))) : null,
      T({ fontFamily: SCRIPT, fontSize: 15, color: C.gold, textAlign: "center" }, "A guide built from your own answers")));
}

function Toc({ sections, pages, guideTitle }) {
  return h(Page, { size: [PAGE_W, PAGE_H], style: { backgroundColor: C.cream, paddingHorizontal: PAD, paddingTop: 0, paddingBottom: 46 } },
    V({ marginHorizontal: -PAD, backgroundColor: C.burgundy, paddingVertical: 22, paddingHorizontal: PAD, alignItems: "center", marginBottom: 22 },
      T({ fontFamily: SERIF, fontWeight: 700, fontSize: 28, color: C.white, letterSpacing: 4 }, "CONTENTS"),
      V({ width: 40, height: 2, backgroundColor: C.gold, marginTop: 8 })),
    h(Card, { style: { padding: 6 } },
      ...sections.map((s, i) => h(Link, { key: i, src: `#sec${i}`, style: { textDecoration: "none" } },
        h(View, { style: { flexDirection: "row", alignItems: "center", paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: i < sections.length - 1 ? 0.75 : 0, borderBottomColor: C.line } },
          V({ width: 24, height: 24, borderRadius: 12, backgroundColor: C.burgundy, alignItems: "center", justifyContent: "center", marginRight: 12 }, T({ color: C.gold, fontWeight: 700, fontSize: 9 }, String(i + 1).padStart(2, "0"))),
          T({ flex: 1, fontFamily: SERIF, fontSize: 13, color: C.ink }, s.title),
          T({ color: C.muted, fontSize: 10, fontWeight: 600 }, pages[i] ? `p.${String(pages[i]).padStart(2, "0")}` : ""))))),
    V({ marginTop: 18, flexDirection: "row", alignItems: "center", backgroundColor: C.blush, borderRadius: 10, padding: 12 },
      V({ marginRight: 12, borderWidth: 2, borderColor: C.gold, borderRadius: 26 }, h(Avatar, { size: 44 })),
      V({ flex: 1 }, T({ fontFamily: SCRIPT, fontSize: 18, color: C.burgundy }, "Hi, it's Quinn"), T({ fontSize: 9.5, lineHeight: 1.5, marginTop: 1 }, "Everything in this guide was built around your answers. Tick the boxes as you go and keep it on your phone - you can tap the contents above to jump to any section."))),
    h(Footer, { guideTitle }));
}

function SectionPage({ section, index, pages, hero, state }) {
  const src = index === 0 ? imgSrc(hero) : null;
  return h(Page, { size: [PAGE_W, PAGE_H], wrap: true, style: { backgroundColor: C.cream, paddingHorizontal: PAD, paddingTop: 34, paddingBottom: 48 } },
    h(View, { id: `sec${index}`, style: { marginTop: -34, marginHorizontal: -PAD, backgroundColor: C.burgundy, paddingVertical: 18, paddingHorizontal: PAD, flexDirection: "row", alignItems: "center", marginBottom: 14 } },
      T({ fontFamily: SERIF, fontSize: 30, color: C.gold, marginRight: 12 }, String(index + 1).padStart(2, "0")),
      V({ width: 1.5, height: 26, backgroundColor: C.gold, marginRight: 12 }),
      T({ flex: 1, fontFamily: SERIF, fontWeight: 700, fontSize: 19, color: C.white, lineHeight: 1.2 }, section.title),
      h(Text, { style: { fontSize: 1, color: C.burgundy }, render: ({ pageNumber }) => { pages[index] = pageNumber; return " "; } })),
    src ? h(Image, { src, style: { width: "100%", height: 110, objectFit: "cover", borderRadius: 10, marginBottom: 12 } }) : null,
    ...section.blocks.map((block, bi) => h(Block, { key: bi, block, state })),
    h(Footer, { guideTitle: state.guideTitle }));
}

function ClosingPage({ guideTitle, preparedFor }) {
  return h(Page, { size: [PAGE_W, PAGE_H], style: { backgroundColor: C.deep } },
    V({ position: "absolute", top: 0, left: 0, right: 0, height: 8, backgroundColor: C.gold }),
    V({ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 70 },
      V({ borderWidth: 3, borderColor: C.gold, borderRadius: 60, marginBottom: 22 }, h(Avatar, { size: 104 })),
      T({ fontFamily: SERIF, fontWeight: 700, fontSize: 32, color: C.white, letterSpacing: 3, textAlign: "center" }, "YOU'RE READY"),
      T({ fontFamily: SCRIPT, fontSize: 28, color: C.gold, marginTop: 6, textAlign: "center" }, preparedFor ? `Enjoy every step, ${String(preparedFor).replace(/^prepared for\s*/i, "")}` : "Enjoy every step"),
      V({ width: 40, height: 2, backgroundColor: C.gold, marginVertical: 18 }),
      T({ color: "#E8D6DC", fontSize: 10.5, lineHeight: 1.7, textAlign: "center" }, "Thank you for trusting Body By Quinn with your plan. Keep this guide close, tick things off as you go, and come back any time you need it."),
      T({ color: C.gold, fontSize: 8.5, fontWeight: 700, letterSpacing: 2, marginTop: 22 }, "BODYBYQUINN.COM")));
}

function GuideDoc({ args, pages, state }) {
  const { title, categoryName, objectives = [], durationLabel, coverImageBytes, cover } = args;
  const sections = (args.sections || []).filter((s) => (s.blocks || []).length > 0);
  const guideTitle = cover?.title || title;
  state.guideTitle = guideTitle;
  return h(Document, { title: clean(guideTitle), author: "Body By Quinn", subject: clean(categoryName || "") },
    h(Cover, { title, categoryName, objectives, durationLabel: cover ? null : durationLabel, coverImageBytes, cover, sections }),
    h(Toc, { sections, pages, guideTitle }),
    ...sections.map((section, i) => h(SectionPage, { key: i, section, index: i, pages, hero: coverImageBytes, state })),
    h(ClosingPage, { guideTitle, preparedFor: cover?.preparedFor }));
}

export async function renderGuidePdfMagazine(args) {
  registerFonts();
  const pages = {};
  // Pass 1 records each section's starting page for the contents list; pass 2
  // renders the final file with those page numbers filled in.
  await renderToBuffer(h(GuideDoc, { args, pages, state: {} }));
  const buf = await renderToBuffer(h(GuideDoc, { args, pages: { ...pages }, state: {} }));
  return new Uint8Array(buf);
}
