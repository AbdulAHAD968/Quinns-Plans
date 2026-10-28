import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 612; // US Letter
const PAGE_HEIGHT = 792;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = 32;
const HEADER_Y = PAGE_HEIGHT - 32;
const CONTENT_TOP = PAGE_HEIGHT - 76; // below header
const CONTENT_BOTTOM = MARGIN + 20; // above footer

// Rose/pink editorial palette -- warm, soft, still legible and professional
// rather than literal pastel "baby pink."
const COLORS = {
  ink: rgb(0.16, 0.08, 0.1),
  body: rgb(0.26, 0.15, 0.17),
  muted: rgb(0.52, 0.38, 0.4),
  mutedSoft: rgb(0.68, 0.56, 0.58),
  accent: rgb(0.78, 0.25, 0.42),
  accentSoft: rgb(0.96, 0.85, 0.89),
  hairline: rgb(0.92, 0.83, 0.86),
  warningBg: rgb(0.98, 0.9, 0.89),
  warningBorder: rgb(0.78, 0.33, 0.35),
  tipBg: rgb(0.97, 0.9, 0.93),
  tipBorder: rgb(0.68, 0.33, 0.48),
  noteBg: rgb(0.96, 0.92, 0.93),
  noteBorder: rgb(0.63, 0.5, 0.53),
  white: rgb(1, 1, 1),
  dark: rgb(0.2, 0.08, 0.12),
};

// pdf-lib's base-14 Helvetica + WinAnsiEncoding silently mis-measures and
// mis-renders several common accented/typographic characters (confirmed:
// e-acute, degree sign) even though they're nominally within WinAnsi's
// range -- rather than chase that further, transliterate to plain ASCII
// before anything reaches drawText/widthOfTextAtSize, since AI-generated
// text reliably produces these characters (accented loanwords, degree
// symbols, curly quotes, em dashes, bullets).
const CHAR_REPLACEMENTS = {
  "é": "e", "è": "e", "ê": "e", "ë": "e",
  "á": "a", "à": "a", "â": "a",
  "í": "i", "î": "i",
  "ó": "o", "ô": "o",
  "ú": "u", "û": "u",
  "ñ": "n", "ç": "c",
  "°": "",
  "‘": "'", "’": "'", "“": '"', "”": '"',
  "–": "-", "—": "-",
  "…": "...",
  "•": "-", "●": "-",
  "½": "1/2", "¼": "1/4", "¾": "3/4",
};
const CHAR_REPLACEMENT_RE = new RegExp(Object.keys(CHAR_REPLACEMENTS).join("|"), "g");

function sanitizeText(text) {
  const str = String(text ?? "");
  const replaced = str.replace(CHAR_REPLACEMENT_RE, (ch) => CHAR_REPLACEMENTS[ch] ?? ch);
  // Final safety net: strip anything still outside printable ASCII so a
  // character we didn't anticipate can't corrupt rendering.
  return replaced.replace(/[^\x20-\x7E\n]/g, "");
}

function wrapText(text, font, size, maxWidth) {
  const lines = [];
  for (const paragraph of sanitizeText(text).split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

// Wraps every page's drawText so sanitization is guaranteed at the one
// choke point all rendering passes through, regardless of whether the
// caller remembered to sanitize -- a missed call site would otherwise
// silently reintroduce the encoding bug.
function wrapPageDrawText(page) {
  const original = page.drawText.bind(page);
  page.drawText = (text, options) => original(sanitizeText(text), options);
  return page;
}

export async function renderGuidePdf({ title, categoryName, objectives = [], durationLabel, sections = [], coverImageBytes = null, cover = null }) {
  const pdf = await PDFDocument.create();
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };

  const ctx = { pdf, fonts, page: null, y: 0, pageNum: 0, sectionTitle: "", guideTitle: sanitizeText(cover?.title || title) };

  // A section whose generation came back empty would otherwise render as a
  // bare heading on an almost-blank page; skip it and its TOC entry entirely
  // rather than show the reader a broken-looking page.
  const nonEmptySections = sections.filter((s) => (s.blocks || []).length > 0);

  await drawCoverPage(ctx, { title: cover?.title || title, categoryName, objectives, durationLabel: cover ? null : durationLabel, coverImageBytes, cover });
  drawTocPage(ctx, { sections: nonEmptySections });

  for (const [index, section] of nonEmptySections.entries()) {
    startSectionPage(ctx, section.title, { forceNew: index === 0 });
    for (const block of section.blocks) {
      await drawBlock(ctx, block);
    }
  }

  return pdf.save();
}

// Embeds a JPEG/PNG image buffer and draws it scaled to fit within maxWidth,
// preserving aspect ratio, advancing ctx.y by the drawn height (+ gap).
// Silently skips on any failure (corrupt bytes, unsupported format) so a
// single bad image never breaks the whole guide's generation.
async function drawImage(ctx, bytes, { maxWidth = CONTENT_WIDTH, maxHeight = 220, caption = null } = {}) {
  let image;
  try {
    image = await ctx.pdf.embedJpg(bytes);
  } catch {
    try {
      image = await ctx.pdf.embedPng(bytes);
    } catch {
      return; // not a usable image; skip rather than throw
    }
  }

  let { width, height } = image.scale(1);
  const widthScale = maxWidth / width;
  const heightScale = maxHeight / height;
  const scale = Math.min(widthScale, heightScale, 1);
  width *= scale;
  height *= scale;

  ensureSpace(ctx, height + (caption ? 16 : 0) + 10);
  const x = MARGIN + (CONTENT_WIDTH - width) / 2;
  ctx.page.drawImage(image, { x, y: ctx.y - height, width, height });
  ctx.y -= height;

  if (caption) {
    ctx.y -= 6;
    const lines = wrapText(caption, ctx.fonts.italic, 9, CONTENT_WIDTH);
    for (const line of lines) {
      const lineWidth = ctx.fonts.italic.widthOfTextAtSize(line, 9);
      ctx.page.drawText(line, { x: MARGIN + (CONTENT_WIDTH - lineWidth) / 2, y: ctx.y, size: 9, font: ctx.fonts.italic, color: COLORS.muted });
      ctx.y -= 13;
    }
  }
  ctx.y -= 10;
}

// ── Page scaffolding ────────────────────────────────────────────────────

function addContentPage(ctx) {
  ctx.page = wrapPageDrawText(ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]));
  ctx.pageNum += 1;
  ctx.y = CONTENT_TOP;
  drawHeaderFooter(ctx);
}

function drawHeaderFooter(ctx) {
  const { page, fonts } = ctx;
  if (ctx.sectionTitle) {
    page.drawText(ctx.guideTitle.toUpperCase(), { x: MARGIN, y: HEADER_Y, size: 8, font: fonts.bold, color: COLORS.mutedSoft });
    const sectionLabelWidth = fonts.regular.widthOfTextAtSize(ctx.sectionTitle, 8);
    page.drawText(ctx.sectionTitle, { x: PAGE_WIDTH - MARGIN - sectionLabelWidth, y: HEADER_Y, size: 8, font: fonts.regular, color: COLORS.mutedSoft });
    page.drawLine({ start: { x: MARGIN, y: HEADER_Y - 8 }, end: { x: PAGE_WIDTH - MARGIN, y: HEADER_Y - 8 }, thickness: 0.75, color: COLORS.hairline });
  }
  const pageLabel = String(ctx.pageNum);
  const pageLabelWidth = fonts.regular.widthOfTextAtSize(pageLabel, 9);
  page.drawText(pageLabel, { x: (PAGE_WIDTH - pageLabelWidth) / 2, y: FOOTER_Y, size: 9, font: fonts.regular, color: COLORS.mutedSoft });
}

function ensureSpace(ctx, neededHeight) {
  if (ctx.y - neededHeight < CONTENT_BOTTOM) addContentPage(ctx);
}

function startSectionPage(ctx, sectionTitle, { forceNew = false } = {}) {
  ctx.sectionTitle = sectionTitle;
  // Short sections share a page with the previous one instead of leaving blank space.
  const continuing = !forceNew && ctx.y - 380 > CONTENT_BOTTOM;
  if (continuing) {
    ctx.y -= 10;
    ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: MARGIN + CONTENT_WIDTH, y: ctx.y }, thickness: 0.75, color: COLORS.hairline });
    ctx.y -= 30;
  } else {
    addContentPage(ctx);
  }
  const titleLines = wrapText(sectionTitle, ctx.fonts.bold, 22, CONTENT_WIDTH);
  for (const line of titleLines) {
    ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size: 22, font: ctx.fonts.bold, color: COLORS.ink });
    ctx.y -= 28;
  }
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y + 6 }, end: { x: MARGIN + 60, y: ctx.y + 6 }, thickness: 2, color: COLORS.accent });
  ctx.y -= 18;
}

// ── Cover + table of contents ───────────────────────────────────────────

async function drawCoverPage(ctx, { title, categoryName, objectives, durationLabel, coverImageBytes, cover = null }) {
  const page = wrapPageDrawText(ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]));
  ctx.pageNum += 1;
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: COLORS.dark });

  let imageBottom = PAGE_HEIGHT;
  if (coverImageBytes) {
    let image;
    try {
      image = await ctx.pdf.embedJpg(coverImageBytes);
    } catch {
      try { image = await ctx.pdf.embedPng(coverImageBytes); } catch { image = null; }
    }
    if (image) {
      const bandHeight = 280;
      const { width: iw, height: ih } = image.scale(1);
      const scale = Math.max(PAGE_WIDTH / iw, bandHeight / ih);
      const drawW = iw * scale;
      const drawH = ih * scale;
      page.drawImage(image, { x: (PAGE_WIDTH - drawW) / 2, y: PAGE_HEIGHT - bandHeight, width: drawW, height: drawH });
      page.drawRectangle({ x: 0, y: PAGE_HEIGHT - bandHeight, width: PAGE_WIDTH, height: bandHeight, color: COLORS.dark, opacity: 0.35 });
      imageBottom = PAGE_HEIGHT - bandHeight;
    }
  }

  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 10, width: PAGE_WIDTH, height: 10, color: COLORS.accent });

  let y = Math.min(PAGE_HEIGHT - 170, imageBottom - 40);

  if (categoryName) {
    const label = categoryName.toUpperCase();
    page.drawText(label, { x: MARGIN, y, size: 11, font: ctx.fonts.bold, color: COLORS.accent });
    y -= 34;
  }

  const titleLines = wrapText(title, ctx.fonts.bold, 34, CONTENT_WIDTH);
  for (const line of titleLines) {
    page.drawText(line, { x: MARGIN, y, size: 34, font: ctx.fonts.bold, color: COLORS.white });
    y -= 42;
  }
  y -= 16;

  if (durationLabel) {
    page.drawText(durationLabel, { x: MARGIN, y, size: 12, font: ctx.fonts.italic, color: rgb(0.85, 0.82, 0.77) });
    y -= 36;
  }

  if (cover) {
    if (cover.subtitle) {
      page.drawText(cover.subtitle, { x: MARGIN, y, size: 13, font: ctx.fonts.italic, color: rgb(0.85, 0.82, 0.77) });
      y -= 24;
    }
    if (cover.details) {
      page.drawText(cover.details, { x: MARGIN, y, size: 11, font: ctx.fonts.bold, color: COLORS.accent });
      y -= 22;
    }
    if (cover.preparedFor) {
      page.drawText(cover.preparedFor, { x: MARGIN, y, size: 15, font: ctx.fonts.bold, color: COLORS.white });
      y -= 30;
    }
  }

  if (objectives.length) {
    for (const obj of objectives.slice(0, 5)) {
      const lines = wrapText(obj, ctx.fonts.regular, 12, CONTENT_WIDTH - 22);
      page.drawCircle({ x: MARGIN + 3, y: y + 4, size: 2, color: COLORS.accent });
      lines.forEach((line, i) => {
        page.drawText(line, { x: MARGIN + 18, y: y - i * 16, size: 12, font: ctx.fonts.regular, color: rgb(0.92, 0.9, 0.87) });
      });
      y -= lines.length * 16 + 8;
    }
  }

  const footerText = "Body By Quinn";
  page.drawText(footerText, { x: MARGIN, y: 60, size: 11, font: ctx.fonts.bold, color: COLORS.accent });
  page.drawText("A personalized guide, built from your own answers.", { x: MARGIN, y: 42, size: 9, font: ctx.fonts.regular, color: rgb(0.7, 0.67, 0.63) });
}

function drawTocPage(ctx, { sections }) {
  addContentPage(ctx);
  ctx.page.drawText("Contents", { x: MARGIN, y: ctx.y, size: 22, font: ctx.fonts.bold, color: COLORS.ink });
  ctx.y -= 40;

  sections.forEach((s, i) => {
    ensureSpace(ctx, 24);
    const num = String(i + 1).padStart(2, "0");
    ctx.page.drawText(num, { x: MARGIN, y: ctx.y, size: 12, font: ctx.fonts.bold, color: COLORS.accent });
    ctx.page.drawText(s.title, { x: MARGIN + 32, y: ctx.y, size: 12, font: ctx.fonts.regular, color: COLORS.body });
    ctx.y -= 26;
  });
}

// ── Block renderers ──────────────────────────────────────────────────────

function drawBlockTitle(ctx, text) {
  ensureSpace(ctx, 22);
  ctx.page.drawText(text, { x: MARGIN, y: ctx.y, size: 12.5, font: ctx.fonts.bold, color: COLORS.ink });
  ctx.y -= 20;
}

function drawParagraphLines(ctx, lines, { size = 11, color = COLORS.body, lineGap = 5, font = ctx.fonts.regular, indent = 0 } = {}) {
  const lineHeight = size + lineGap;
  for (const line of lines) {
    ensureSpace(ctx, lineHeight);
    if (line) ctx.page.drawText(line, { x: MARGIN + indent, y: ctx.y, size, font, color });
    ctx.y -= lineHeight;
  }
}

async function drawBlock(ctx, block) {
  switch (block.type) {
    case "paragraph":
      return drawParagraph(ctx, block);
    case "numbered_steps":
      return drawNumberedSteps(ctx, block);
    case "checklist":
      return drawChecklist(ctx, block);
    case "table":
      return drawTable(ctx, block);
    case "callout":
      return drawCallout(ctx, block);
    case "comparison":
      return drawComparison(ctx, block);
    case "recipe":
      return drawRecipe(ctx, block);
    case "flow":
      return drawFlow(ctx, block);
    case "timeline":
      return drawTimeline(ctx, block);
    case "stats":
      return drawStats(ctx, block);
    case "product_picks":
      return drawProductPicks(ctx, block);
    case "packing_list":
      return drawPackingList(ctx, block);
    case "pack_diagram":
      return drawPackDiagram(ctx, block);
    case "image":
      return block.bytes ? drawImage(ctx, block.bytes, { caption: block.caption || null }) : undefined;
    default:
      return;
  }
}

// A recipe is its own block type (not assembled from table/numbered_steps/
// callout) so the renderer can guarantee the exact fixed structure the
// client's reference guide uses every time: title, optional image, serving
// count, ingredients, instructions, one swap line -- never missing a field,
// never reordered.
async function drawRecipe(ctx, block) {
  ensureSpace(ctx, 30);
  ctx.page.drawText(block.name, { x: MARGIN, y: ctx.y, size: 14, font: ctx.fonts.bold, color: COLORS.accent });
  ctx.y -= 20;

  if (block.imageBytes) {
    await drawImage(ctx, block.imageBytes, { maxWidth: 220, maxHeight: 150 });
  }

  const servingsLine = block.servings ? `Ingredients (${block.servings}):` : "Ingredients:";
  ensureSpace(ctx, 16);
  ctx.page.drawText(servingsLine, { x: MARGIN, y: ctx.y, size: 10.5, font: ctx.fonts.bold, color: COLORS.ink });
  ctx.y -= 16;

  const ingredientsText = (block.ingredients || []).join("; ") + (block.ingredients?.length ? "." : "");
  drawParagraphLines(ctx, wrapText(ingredientsText, ctx.fonts.regular, 10.5, CONTENT_WIDTH), { size: 10.5, lineGap: 4 });
  ctx.y -= 6;

  ensureSpace(ctx, 16);
  ctx.page.drawText("How to prepare:", { x: MARGIN, y: ctx.y, size: 10.5, font: ctx.fonts.bold, color: COLORS.ink });
  ctx.y -= 16;
  drawParagraphLines(ctx, wrapText(block.instructions || "", ctx.fonts.regular, 10.5, CONTENT_WIDTH), { size: 10.5, lineGap: 4 });
  ctx.y -= 6;

  if (block.swap) {
    ensureSpace(ctx, 16);
    const swapLines = wrapText(`Swap option: ${block.swap}`, ctx.fonts.italic, 10, CONTENT_WIDTH);
    for (const line of swapLines) {
      ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size: 10, font: ctx.fonts.italic, color: COLORS.muted });
      ctx.y -= 14;
    }
  }
  ctx.y -= 14;
}

function drawParagraph(ctx, block) {
  const lines = wrapText(block.text, ctx.fonts.regular, 11, CONTENT_WIDTH);
  drawParagraphLines(ctx, lines, { lineGap: 6 });
  ctx.y -= 10;
}

function drawNumberedSteps(ctx, block) {
  if (block.title) drawBlockTitle(ctx, block.title);
  block.steps.forEach((step, i) => {
    const marker = `${i + 1}.`;
    const markerWidth = ctx.fonts.bold.widthOfTextAtSize(marker, 11) + 8;
    const lines = wrapText(step, ctx.fonts.regular, 11, CONTENT_WIDTH - markerWidth);
    ensureSpace(ctx, 16);
    ctx.page.drawText(marker, { x: MARGIN, y: ctx.y, size: 11, font: ctx.fonts.bold, color: COLORS.accent });
    lines.forEach((line, li) => {
      ensureSpace(ctx, 16);
      ctx.page.drawText(line, { x: MARGIN + markerWidth, y: ctx.y, size: 11, font: ctx.fonts.regular, color: COLORS.body });
      ctx.y -= 16;
    });
    ctx.y -= 4;
  });
  ctx.y -= 8;
}

function drawChecklist(ctx, block) {
  if (block.title) drawBlockTitle(ctx, block.title);
  const boxSize = 9;
  const indent = boxSize + 10;
  for (const item of block.items) {
    const lines = wrapText(item, ctx.fonts.regular, 11, CONTENT_WIDTH - indent);
    ensureSpace(ctx, 16);
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - boxSize + 2, width: boxSize, height: boxSize, borderColor: COLORS.accent, borderWidth: 1.2 });
    lines.forEach((line, li) => {
      ensureSpace(ctx, 16);
      ctx.page.drawText(line, { x: MARGIN + indent, y: ctx.y, size: 11, font: ctx.fonts.regular, color: COLORS.body });
      ctx.y -= 16;
    });
    ctx.y -= 2;
  }
  ctx.y -= 8;
}

function drawTable(ctx, block) {
  if (block.title) drawBlockTitle(ctx, block.title);

  const colCount = block.columns.length;
  const cbW = block.checkbox ? 22 : 0;
  const colWidth = (CONTENT_WIDTH - cbW) / colCount;
  const cellPad = 6;
  const fontSize = 9.5;

  function measureRowHeight(cells) {
    let maxLines = 1;
    for (const cell of cells) {
      const lines = wrapText(cell, ctx.fonts.regular, fontSize, colWidth - cellPad * 2);
      maxLines = Math.max(maxLines, lines.length);
    }
    return maxLines * (fontSize + 4) + cellPad * 2;
  }

  function drawRow(cells, { header = false } = {}) {
    const height = measureRowHeight(cells);
    ensureSpace(ctx, height);
    const rowTop = ctx.y;
    if (header) {
      ctx.page.drawRectangle({ x: MARGIN, y: rowTop - height, width: CONTENT_WIDTH, height, color: COLORS.accentSoft });
    } else if (block.checkbox) {
      ctx.page.drawRectangle({ x: MARGIN + 6, y: rowTop - cellPad - 9, width: 9, height: 9, borderColor: COLORS.accent, borderWidth: 1.1 });
    }
    cells.forEach((cell, ci) => {
      const lines = wrapText(cell, ctx.fonts.regular, fontSize, colWidth - cellPad * 2);
      let cy = rowTop - cellPad - fontSize;
      for (const line of lines) {
        ctx.page.drawText(line, {
          x: MARGIN + cbW + ci * colWidth + cellPad,
          y: cy,
          size: fontSize,
          font: header ? ctx.fonts.bold : ctx.fonts.regular,
          color: header ? COLORS.ink : COLORS.body,
        });
        cy -= fontSize + 4;
      }
    });
    ctx.page.drawLine({ start: { x: MARGIN, y: rowTop - height }, end: { x: MARGIN + CONTENT_WIDTH, y: rowTop - height }, thickness: 0.5, color: COLORS.hairline });
    ctx.y = rowTop - height;
  }

  drawRow(block.columns, { header: true });
  for (const row of block.rows) drawRow(row);
  ctx.y -= 12;
}

function drawCallout(ctx, block) {
  const palette = {
    warning: { bg: COLORS.warningBg, border: COLORS.warningBorder, label: "WARNING" },
    tip: { bg: COLORS.tipBg, border: COLORS.tipBorder, label: "TIP" },
    note: { bg: COLORS.noteBg, border: COLORS.noteBorder, label: "NOTE" },
  }[block.tone] || { bg: COLORS.noteBg, border: COLORS.noteBorder, label: "NOTE" };

  const pad = 12;
  const labelHeight = 14;
  const lines = wrapText(block.text, ctx.fonts.regular, 10.5, CONTENT_WIDTH - pad * 2);
  const boxHeight = labelHeight + lines.length * 15 + pad * 2;

  ensureSpace(ctx, boxHeight + 8);
  const top = ctx.y;
  ctx.page.drawRectangle({ x: MARGIN, y: top - boxHeight, width: CONTENT_WIDTH, height: boxHeight, color: palette.bg });
  ctx.page.drawRectangle({ x: MARGIN, y: top - boxHeight, width: 3, height: boxHeight, color: palette.border });
  ctx.page.drawText(palette.label, { x: MARGIN + pad, y: top - pad - 9, size: 8, font: ctx.fonts.bold, color: palette.border });

  let ty = top - pad - labelHeight - 9;
  for (const line of lines) {
    ctx.page.drawText(line, { x: MARGIN + pad, y: ty, size: 10.5, font: ctx.fonts.regular, color: COLORS.body });
    ty -= 15;
  }
  ctx.y = top - boxHeight - 12;
}

function drawComparison(ctx, block) {
  if (block.title) drawBlockTitle(ctx, block.title);

  const gap = 16;
  const colWidth = (CONTENT_WIDTH - gap * (block.options.length - 1)) / block.options.length;

  function measureOptionHeight(opt) {
    let h = 20; // label
    for (const pro of opt.pros) h += wrapText(`• ${pro}`, ctx.fonts.regular, 10, colWidth - 16).length * 14;
    if (opt.notes) h += wrapText(opt.notes, ctx.fonts.italic, 9.5, colWidth - 16).length * 13 + 6;
    return h + 16;
  }

  const boxHeight = Math.max(...block.options.map(measureOptionHeight));
  ensureSpace(ctx, boxHeight + 8);
  const top = ctx.y;

  block.options.forEach((opt, i) => {
    const x = MARGIN + i * (colWidth + gap);
    ctx.page.drawRectangle({ x, y: top - boxHeight, width: colWidth, height: boxHeight, borderColor: COLORS.hairline, borderWidth: 1 });
    let oy = top - 18;
    ctx.page.drawText(opt.label, { x: x + 10, y: oy, size: 11, font: ctx.fonts.bold, color: COLORS.accent });
    oy -= 18;
    for (const pro of opt.pros) {
      const lines = wrapText(`• ${pro}`, ctx.fonts.regular, 10, colWidth - 16);
      for (const line of lines) {
        ctx.page.drawText(line, { x: x + 10, y: oy, size: 10, font: ctx.fonts.regular, color: COLORS.body });
        oy -= 14;
      }
    }
    if (opt.notes) {
      oy -= 4;
      const lines = wrapText(opt.notes, ctx.fonts.italic, 9.5, colWidth - 16);
      for (const line of lines) {
        ctx.page.drawText(line, { x: x + 10, y: oy, size: 9.5, font: ctx.fonts.italic, color: COLORS.muted });
        oy -= 13;
      }
    }
  });

  ctx.y = top - boxHeight - 14;
}


// ── Visual blocks (native vector diagrams) ───────────────────────────────

function drawArrowHead(page, x, y, dir) {
  const s = 5;
  const opts = { thickness: 1.6, color: COLORS.accent };
  if (dir === "right") {
    page.drawLine({ start: { x: x - s, y: y + s }, end: { x, y }, ...opts });
    page.drawLine({ start: { x: x - s, y: y - s }, end: { x, y }, ...opts });
  } else {
    page.drawLine({ start: { x: x - s, y: y + s }, end: { x, y }, ...opts });
    page.drawLine({ start: { x: x + s, y: y + s }, end: { x, y }, ...opts });
  }
}

// Flowchart: rows of up to 3 boxes joined by arrows; rows are joined by an
// elbow connector so the reader follows one continuous path.
function drawFlow(ctx, block) {
  const { fonts } = ctx;
  const perRow = 3;
  const gap = 26;
  const boxW = (CONTENT_WIDTH - gap * (perRow - 1)) / perRow;
  const pad = 8;

  const nodes = block.steps.map((s, i) => ({
    num: String(i + 1),
    labelLines: wrapText(s.label, fonts.bold, 10, boxW - pad * 2 - 14),
    detailLines: s.detail ? wrapText(s.detail, fonts.regular, 8.5, boxW - pad * 2) : [],
  }));
  nodes.forEach((n) => {
    n.h = pad * 2 + 4 + n.labelLines.length * 12 + (n.detailLines.length ? n.detailLines.length * 11 + 4 : 0);
  });

  const totalH = Math.ceil(nodes.length / perRow) * (Math.max(...nodes.map((n) => n.h)) + 30);
  ensureSpace(ctx, Math.min(totalH, 330) + 30);
  if (block.title) drawBlockTitle(ctx, block.title);

  for (let start = 0; start < nodes.length; start += perRow) {
    const row = nodes.slice(start, start + perRow);
    const rowH = Math.max(...row.map((n) => n.h));
    ensureSpace(ctx, rowH + 30);
    const top = ctx.y;
    row.forEach((n, i) => {
      const x = MARGIN + i * (boxW + gap);
      ctx.page.drawRectangle({ x, y: top - rowH, width: boxW, height: rowH, color: COLORS.accentSoft, borderColor: COLORS.accent, borderWidth: 1 });
      ctx.page.drawCircle({ x: x + pad + 5, y: top - pad - 5, size: 7, color: COLORS.accent });
      const numW = fonts.bold.widthOfTextAtSize(n.num, 8);
      ctx.page.drawText(n.num, { x: x + pad + 5 - numW / 2, y: top - pad - 8, size: 8, font: fonts.bold, color: COLORS.white });
      let ty = top - pad - 8;
      n.labelLines.forEach((l) => {
        ctx.page.drawText(l, { x: x + pad + 16, y: ty, size: 10, font: fonts.bold, color: COLORS.ink });
        ty -= 12;
      });
      ty -= 2;
      n.detailLines.forEach((l) => {
        ctx.page.drawText(l, { x: x + pad, y: ty, size: 8.5, font: fonts.regular, color: COLORS.body });
        ty -= 11;
      });
      if (i < row.length - 1) {
        const ay = top - rowH / 2;
        ctx.page.drawLine({ start: { x: x + boxW + 3, y: ay }, end: { x: x + boxW + gap - 3, y: ay }, thickness: 1.6, color: COLORS.accent });
        drawArrowHead(ctx.page, x + boxW + gap - 3, ay, "right");
      }
    });
    ctx.y = top - rowH;
    if (start + perRow < nodes.length) {
      const lastX = MARGIN + (row.length - 1) * (boxW + gap) + boxW / 2;
      const firstX = MARGIN + boxW / 2;
      const o = { thickness: 1.6, color: COLORS.accent };
      ctx.page.drawLine({ start: { x: lastX, y: ctx.y }, end: { x: lastX, y: ctx.y - 12 }, ...o });
      ctx.page.drawLine({ start: { x: lastX, y: ctx.y - 12 }, end: { x: firstX, y: ctx.y - 12 }, ...o });
      ctx.page.drawLine({ start: { x: firstX, y: ctx.y - 12 }, end: { x: firstX, y: ctx.y - 22 }, ...o });
      drawArrowHead(ctx.page, firstX, ctx.y - 22, "down");
      ctx.y -= 28;
    }
  }
  ctx.y -= 16;
}

function drawTimeline(ctx, block) {
  const { fonts } = ctx;
  if (block.title) drawBlockTitle(ctx, block.title);
  const whenW = 84;
  const textX = MARGIN + whenW + 22;
  const textW = CONTENT_WIDTH - whenW - 22;

  block.events.forEach((e, i) => {
    const whenLines = wrapText(e.when || "", fonts.bold, 9.5, whenW);
    const labelLines = wrapText(e.label, fonts.bold, 10.5, textW);
    const detailLines = e.detail ? wrapText(e.detail, fonts.regular, 9.5, textW) : [];
    const taskLines = (e.tasks || []).map((t) => wrapText(t, fonts.regular, 9.5, textW - 16));
    const tasksH = taskLines.reduce((sum, l) => sum + l.length * 12 + 3, 0);
    const h = Math.max(whenLines.length * 12, labelLines.length * 13 + detailLines.length * 12.5 + tasksH + (tasksH ? 3 : 0)) + 14;
    ensureSpace(ctx, h);
    const top = ctx.y;
    const dotX = MARGIN + whenW + 10;
    if (i < block.events.length - 1) {
      ctx.page.drawLine({ start: { x: dotX, y: top - 5 }, end: { x: dotX, y: top - h - 5 }, thickness: 1.5, color: COLORS.accentSoft });
    }
    ctx.page.drawCircle({ x: dotX, y: top - 4, size: 5, color: COLORS.accent, borderColor: COLORS.white, borderWidth: 1.5 });
    whenLines.forEach((l, k) => {
      const w = fonts.bold.widthOfTextAtSize(l, 9.5);
      ctx.page.drawText(l, { x: MARGIN + whenW - w, y: top - 7 - k * 12, size: 9.5, font: fonts.bold, color: COLORS.accent });
    });
    let ty = top - 7;
    labelLines.forEach((l) => { ctx.page.drawText(l, { x: textX, y: ty, size: 10.5, font: fonts.bold, color: COLORS.ink }); ty -= 13; });
    detailLines.forEach((l) => { ctx.page.drawText(l, { x: textX, y: ty, size: 9.5, font: fonts.regular, color: COLORS.body }); ty -= 12.5; });
    if (taskLines.length) ty -= 3;
    taskLines.forEach((lines) => {
      ctx.page.drawRectangle({ x: textX, y: ty - 1, width: 8, height: 8, borderColor: COLORS.accent, borderWidth: 1 });
      lines.forEach((l) => { ctx.page.drawText(l, { x: textX + 15, y: ty, size: 9.5, font: fonts.regular, color: COLORS.body }); ty -= 12; });
      ty -= 3;
    });
    ctx.y = top - h;
  });
  ctx.y -= 12;
}

function drawStats(ctx, block) {
  const { fonts } = ctx;
  if (block.title) drawBlockTitle(ctx, block.title);
  const n = block.items.length;
  const gap = 12;
  const w = (CONTENT_WIDTH - gap * (n - 1)) / n;
  const prepared = block.items.map((it) => {
    let size = 22;
    while (size > 12 && fonts.bold.widthOfTextAtSize(sanitizeText(it.value), size) > w - 16) size -= 1;
    return { ...it, size, labelLines: wrapText(it.label, fonts.regular, 9, w - 16) };
  });
  const h = 40 + Math.max(...prepared.map((p) => p.labelLines.length)) * 11 + 8;
  ensureSpace(ctx, h + 10);
  const top = ctx.y;
  prepared.forEach((p, i) => {
    const x = MARGIN + i * (w + gap);
    ctx.page.drawRectangle({ x, y: top - h, width: w, height: h, color: COLORS.accentSoft });
    ctx.page.drawRectangle({ x, y: top - 3, width: w, height: 3, color: COLORS.accent });
    ctx.page.drawText(p.value, { x: x + 8, y: top - 12 - p.size, size: p.size, font: fonts.bold, color: COLORS.accent });
    p.labelLines.forEach((l, k) => ctx.page.drawText(l, { x: x + 8, y: top - 24 - p.size - k * 11, size: 9, font: fonts.regular, color: COLORS.body }));
  });
  ctx.y = top - h - 16;
}


// ── Shoppable product cards ──────────────────────────────────────────────

function addLinkAnnotation(ctx, rect, url) {
  const { pdf, page } = ctx;
  const annot = pdf.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: rect,
    Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
  });
  const ref = pdf.context.register(annot);
  const existing = page.node.Annots();
  if (existing) existing.push(ref);
  else page.node.set(PDFName.of("Annots"), pdf.context.obj([ref]));
}

async function embedAnyImage(pdf, bytes) {
  try { return await pdf.embedJpg(bytes); } catch { /* try png */ }
  try { return await pdf.embedPng(bytes); } catch { return null; }
}

async function drawProductPicks(ctx, block) {
  const { fonts } = ctx;
  ensureSpace(ctx, 330);

  ctx.page.drawText(sanitizeText(block.heading).toUpperCase(), { x: MARGIN, y: ctx.y, size: 15, font: fonts.bold, color: COLORS.ink });
  ctx.y -= 18;
  if (block.subtitle) {
    for (const line of wrapText(block.subtitle, fonts.italic, 10.5, CONTENT_WIDTH)) {
      ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size: 10.5, font: fonts.italic, color: COLORS.muted });
      ctx.y -= 14;
    }
  }
  ctx.y -= 10;

  const gap = 14;
  const cardW = (CONTENT_WIDTH - gap) / 2;
  const pad = 12;
  const imgH = 112;

  const textW = cardW - pad * 2;
  const prepared = [];
  for (const [i, p] of block.products.entries()) {
    const fields = [];
    if (p.spec) fields.push({ text: p.spec, font: fonts.bold, size: 9, color: COLORS.accent });
    if (p.benefit) fields.push({ text: p.benefit, font: fonts.regular, size: 9.5, color: COLORS.body });
    if (p.config) fields.push({ prefix: "What to buy: ", text: p.config, font: fonts.regular, size: 9, color: COLORS.body });
    if (p.fit) fields.push({ prefix: "Your trip: ", text: p.fit, font: fonts.regular, size: 9, color: COLORS.body });
    if (p.alternative) fields.push({ prefix: "Alternative: ", text: p.alternative, font: fonts.italic, size: 8.5, color: COLORS.muted });
    const fieldLines = fields.map((f) => ({ ...f, lines: wrapText(`${f.prefix || ""}${f.text}`, f.font, f.size, textW) }));
    prepared.push({
      ...p,
      num: String(i + 1).padStart(2, "0"),
      image: p.imageBytes ? await embedAnyImage(ctx.pdf, p.imageBytes) : null,
      nameLines: wrapText(p.name, fonts.bold, 11, cardW - pad * 2 - 22),
      fieldLines,
    });
  }

  const fieldsHeight = (c) => c.fieldLines.reduce((sum, f) => sum + f.lines.length * (f.size + 3) + 3, 0);

  for (let r = 0; r < prepared.length; r += 2) {
    const row = prepared.slice(r, r + 2);
    const content = (c) => (c.image ? imgH + 8 : 0) + c.nameLines.length * 14 + fieldsHeight(c) + 6;
    const rowH = Math.max(...row.map(content)) + pad * 2 + 34;
    ensureSpace(ctx, rowH + 10);
    const top = ctx.y;

    row.forEach((c, i) => {
      const x = MARGIN + i * (cardW + gap);
      ctx.page.drawRectangle({ x, y: top - rowH, width: cardW, height: rowH, color: COLORS.white, borderColor: COLORS.hairline, borderWidth: 1 });
      let ty = top - pad;
      if (c.image) {
        const { width: iw, height: ih } = c.image.scale(1);
        const sc = Math.min((cardW - pad * 2) / iw, imgH / ih);
        const w = iw * sc;
        const h = ih * sc;
        ctx.page.drawImage(c.image, { x: x + (cardW - w) / 2, y: ty - imgH + (imgH - h) / 2, width: w, height: h });
        ty -= imgH + 8;
      }
      ty -= 10;
      ctx.page.drawText(c.num, { x: x + pad, y: ty, size: 11, font: fonts.bold, color: COLORS.accent });
      c.nameLines.forEach((l) => {
        ctx.page.drawText(l, { x: x + pad + 22, y: ty, size: 11, font: fonts.bold, color: COLORS.ink });
        ty -= 14;
      });
      ty -= 2;
      c.fieldLines.forEach((f) => {
        f.lines.forEach((l) => {
          ctx.page.drawText(l, { x: x + pad, y: ty, size: f.size, font: f.font, color: f.color });
          ty -= f.size + 3;
        });
        ty -= 3;
      });

      const btnH = 22;
      const btnY = top - rowH + pad;
      const label = c.curated ? "VIEW ON AMAZON  >" : "SEARCH ON AMAZON  >";
      const btnW = Math.min(158, cardW - pad * 2);
      ctx.page.drawRectangle({ x: x + pad, y: btnY, width: btnW, height: btnH, color: COLORS.dark });
      ctx.page.drawText(label, { x: x + pad + 12, y: btnY + 7.5, size: 8, font: fonts.bold, color: COLORS.white });
      addLinkAnnotation(ctx, [x + pad, btnY, x + pad + btnW, btnY + btnH], c.url);
    });

    ctx.y = top - rowH - 12;
  }

  if (!ctx.shopNoteShown && prepared.some((c) => !c.curated)) {
    ctx.shopNoteShown = true;
    const note = "SEARCH ON AMAZON opens a filtered Amazon search for this product type and size. VIEW ON AMAZON opens one specific recommended product. Prices and availability change.";
    for (const line of wrapText(note, fonts.italic, 8.5, CONTENT_WIDTH)) {
      ensureSpace(ctx, 12);
      ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size: 8.5, font: fonts.italic, color: COLORS.muted });
      ctx.y -= 11;
    }
    ctx.y -= 6;
  }

  if (block.tip) {
    const lines = wrapText(`QUINN TIP  /  ${block.tip}`, fonts.bold, 9.5, CONTENT_WIDTH - 24);
    const h = lines.length * 13 + 18;
    ensureSpace(ctx, h + 6);
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - h, width: CONTENT_WIDTH, height: h, color: COLORS.tipBg });
    lines.forEach((l, i) => ctx.page.drawText(l, { x: MARGIN + 12, y: ctx.y - 16 - i * 13, size: 9.5, font: fonts.bold, color: COLORS.ink }));
    ctx.y -= h + 10;
  }
  ctx.y -= 12;
}


// ── Packing list with quantities and checkboxes ─────────────────────────

function drawPackingList(ctx, block) {
  const { fonts } = ctx;
  if (block.title) drawBlockTitle(ctx, block.title);

  const boxW = 20;
  const qtyW = 38;
  const nameW = 200;
  const noteW = CONTENT_WIDTH - boxW - qtyW - nameW;
  let total = 0;

  for (const cat of block.categories) {
    const rows = cat.items.map((item) => ({
      item,
      nameLines: wrapText(item.name, fonts.regular, 10, nameW - 8),
      noteLines: item.note ? wrapText(item.note, fonts.italic, 9, noteW - 8) : [],
    }));
    const rowH = (r) => Math.max(r.nameLines.length * 13, r.noteLines.length * 12) + 8;

    ensureSpace(ctx, 20 + rowH(rows[0]) + 4);
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 18, width: CONTENT_WIDTH, height: 18, color: COLORS.accentSoft });
    ctx.page.drawText(cat.name.toUpperCase(), { x: MARGIN + 8, y: ctx.y - 12.5, size: 9, font: fonts.bold, color: COLORS.ink });
    ctx.page.drawText("QTY", { x: MARGIN + boxW + nameW + 8, y: ctx.y - 12.5, size: 8, font: fonts.bold, color: COLORS.muted });
    ctx.y -= 18;

    for (const r of rows) {
      const h = rowH(r);
      ensureSpace(ctx, h);
      const top = ctx.y;
      ctx.page.drawRectangle({ x: MARGIN + 6, y: top - 15, width: 9, height: 9, borderColor: COLORS.accent, borderWidth: 1.1 });
      r.nameLines.forEach((l, i) => ctx.page.drawText(l, { x: MARGIN + boxW, y: top - 13 - i * 13, size: 10, font: fonts.regular, color: COLORS.ink }));
      ctx.page.drawText(`x${r.item.qty}`, { x: MARGIN + boxW + nameW + 8, y: top - 13, size: 10, font: fonts.bold, color: COLORS.accent });
      r.noteLines.forEach((l, i) => ctx.page.drawText(l, { x: MARGIN + boxW + nameW + qtyW, y: top - 12.5 - i * 12, size: 9, font: fonts.italic, color: COLORS.muted }));
      ctx.page.drawLine({ start: { x: MARGIN, y: top - h }, end: { x: MARGIN + CONTENT_WIDTH, y: top - h }, thickness: 0.5, color: COLORS.hairline });
      ctx.y = top - h;
      total += r.item.qty;
    }
    ctx.y -= 8;
  }

  // Totals are computed here so they always match the rows above.
  ensureSpace(ctx, 28);
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 22, width: CONTENT_WIDTH, height: 22, color: COLORS.dark });
  ctx.page.drawText("TOTAL ITEMS TO PACK", { x: MARGIN + 10, y: ctx.y - 15, size: 9, font: fonts.bold, color: COLORS.white });
  const totalText = String(total);
  ctx.page.drawText(totalText, { x: MARGIN + CONTENT_WIDTH - 10 - fonts.bold.widthOfTextAtSize(totalText, 11), y: ctx.y - 15.5, size: 11, font: fonts.bold, color: COLORS.white });
  ctx.y -= 42;
}

// ── Packing diagrams (suitcase layout / packing cubes) ───────────────────

const ZONE_TINTS = [rgb(0.99, 0.93, 0.95), rgb(0.97, 0.88, 0.92), rgb(0.99, 0.95, 0.9), rgb(0.94, 0.9, 0.95), rgb(0.93, 0.96, 0.93), rgb(0.98, 0.91, 0.89)];

function drawBadge(ctx, x, y, n) {
  ctx.page.drawCircle({ x, y, size: 8, color: COLORS.accent });
  const t = String(n);
  ctx.page.drawText(t, { x: x - ctx.fonts.bold.widthOfTextAtSize(t, 9) / 2, y: y - 3.2, size: 9, font: ctx.fonts.bold, color: COLORS.white });
}

function drawPackDiagram(ctx, block) {
  const { fonts } = ctx;
  if (block.title) drawBlockTitle(ctx, block.title);
  const zones = block.zones;

  if (block.variant === "cubes") {
    const dims = { small: [74, 64], medium: [104, 80], large: [140, 98] };
    const gap = 14;
    // Lay the cubes out in wrapped rows.
    const rows = [[]];
    let rowW = 0;
    zones.forEach((z, i) => {
      const [w, h] = dims[z.size] || dims.medium;
      if (rowW + w > CONTENT_WIDTH && rows[rows.length - 1].length) { rows.push([]); rowW = 0; }
      rows[rows.length - 1].push({ z, i, w, h });
      rowW += w + gap;
    });
    for (const row of rows) {
      const rh = Math.max(...row.map((c) => c.h)) + 18;
      ensureSpace(ctx, rh + 6);
      let x = MARGIN;
      const top = ctx.y;
      for (const c of row) {
        const y0 = top - 10 - c.h;
        ctx.page.drawRectangle({ x, y: y0, width: c.w, height: c.h, color: ZONE_TINTS[c.i % ZONE_TINTS.length], borderColor: COLORS.accent, borderWidth: 1.5 });
        ctx.page.drawLine({ start: { x, y: y0 + c.h - 14 }, end: { x: x + c.w, y: y0 + c.h - 14 }, thickness: 0.8, color: COLORS.accent, dashArray: [3, 2] });
        ctx.page.drawRectangle({ x: x + c.w / 2 - 6, y: y0 + c.h - 12, width: 12, height: 6, color: COLORS.accent });
        const labelLines = wrapText(c.z.label, fonts.bold, 9, c.w - 10);
        labelLines.forEach((l, k) => {
          const lw = fonts.bold.widthOfTextAtSize(l, 9);
          ctx.page.drawText(l, { x: x + (c.w - lw) / 2, y: y0 + (c.h - 14) / 2 - k * 11 + 2, size: 9, font: fonts.bold, color: COLORS.ink });
        });
        drawBadge(ctx, x + 12, y0 + 12, c.i + 1);
        x += c.w + gap;
      }
      ctx.y = top - rh;
    }
    ctx.y -= 4;
    drawDiagramLegend(ctx, zones, CONTENT_WIDTH, MARGIN, (z) => `${z.label}${z.size ? ` (${z.size})` : ""}`);
  } else {
    // Top-down open suitcase: outer shell, handle, and numbered zones.
    const caseW = 290;
    const caseH = 250;
    const legendX = MARGIN + caseW + 22;
    const legendW = CONTENT_WIDTH - caseW - 22;
    const legendLines = zones.map((z) => ({ z, lines: wrapText(z.contents, fonts.regular, 9, legendW - 24) }));
    const legendH = legendLines.reduce((sum, l) => sum + 14 + l.lines.length * 11.5 + 8, 0);
    const need = Math.max(caseH + 22, legendH) + 10;
    ensureSpace(ctx, need);
    const top = ctx.y;

    ctx.page.drawRectangle({ x: MARGIN + caseW / 2 - 24, y: top - 8, width: 48, height: 8, color: COLORS.mutedSoft });
    ctx.page.drawRectangle({ x: MARGIN, y: top - 8 - caseH, width: caseW, height: caseH, color: COLORS.accentSoft, borderColor: COLORS.accent, borderWidth: 2 });
    const inset = 12;
    const innerX = MARGIN + inset;
    const innerY = top - 8 - caseH + inset;
    const innerW = caseW - inset * 2;
    const innerH = caseH - inset * 2;
    ctx.page.drawRectangle({ x: innerX, y: innerY, width: innerW, height: innerH, color: COLORS.white });

    const cols = zones.length <= 2 ? 1 : 2;
    const rowsN = Math.ceil(zones.length / cols);
    const zg = 6;
    const zw = (innerW - zg * (cols + 1)) / cols;
    const zh = (innerH - zg * (rowsN + 1)) / rowsN;
    zones.forEach((z, i) => {
      const cx = innerX + zg + (i % cols) * (zw + zg);
      const cy = innerY + innerH - zg - zh - Math.floor(i / cols) * (zh + zg);
      ctx.page.drawRectangle({ x: cx, y: cy, width: zw, height: zh, color: ZONE_TINTS[i % ZONE_TINTS.length], borderColor: COLORS.accent, borderWidth: 1, borderDashArray: [3, 2] });
      wrapText(z.label, fonts.bold, 9.5, zw - 14).forEach((l, k) => {
        const lw = fonts.bold.widthOfTextAtSize(l, 9.5);
        ctx.page.drawText(l, { x: cx + (zw - lw) / 2, y: cy + zh / 2 - 2 - k * 11, size: 9.5, font: fonts.bold, color: COLORS.ink });
      });
      drawBadge(ctx, cx + 12, cy + zh - 12, i + 1);
    });

    let ly = top - 4;
    legendLines.forEach(({ z, lines }, i) => {
      drawBadge(ctx, legendX + 8, ly - 4, i + 1);
      ctx.page.drawText(z.label, { x: legendX + 22, y: ly - 7, size: 10, font: fonts.bold, color: COLORS.ink });
      lines.forEach((l, k) => ctx.page.drawText(l, { x: legendX + 22, y: ly - 20 - k * 11.5, size: 9, font: fonts.regular, color: COLORS.body }));
      ly -= 14 + lines.length * 11.5 + 8;
    });
    ctx.y = top - Math.max(caseH + 8, legendH) - 14;
  }

  if (block.caption) {
    for (const line of wrapText(block.caption, fonts.italic, 9.5, CONTENT_WIDTH)) {
      ensureSpace(ctx, 13);
      ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size: 9.5, font: fonts.italic, color: COLORS.muted });
      ctx.y -= 13;
    }
  }
  ctx.y -= 12;
}

function drawDiagramLegend(ctx, zones, width, x0, labelOf) {
  const { fonts } = ctx;
  zones.forEach((z, i) => {
    const lines = wrapText(`${labelOf(z)}: ${z.contents}`, fonts.regular, 9.5, width - 26);
    ensureSpace(ctx, lines.length * 12 + 6);
    drawBadge(ctx, x0 + 8, ctx.y - 3, i + 1);
    lines.forEach((l, k) => ctx.page.drawText(l, { x: x0 + 24, y: ctx.y - k * 12 - 6, size: 9.5, font: fonts.regular, color: COLORS.body }));
    ctx.y -= lines.length * 12 + 6;
  });
}
