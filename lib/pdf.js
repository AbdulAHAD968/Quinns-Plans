import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 612; // US Letter
const PAGE_HEIGHT = 792;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = 32;
const HEADER_Y = PAGE_HEIGHT - 32;
const CONTENT_TOP = PAGE_HEIGHT - 76; // below header
const CONTENT_BOTTOM = MARGIN + 20; // above footer

const COLORS = {
  ink: rgb(0.11, 0.1, 0.09),
  body: rgb(0.2, 0.18, 0.16),
  muted: rgb(0.45, 0.42, 0.38),
  mutedSoft: rgb(0.6, 0.57, 0.53),
  accent: rgb(0.71, 0.41, 0.25),
  accentSoft: rgb(0.93, 0.88, 0.82),
  hairline: rgb(0.89, 0.86, 0.8),
  warningBg: rgb(0.98, 0.93, 0.89),
  warningBorder: rgb(0.78, 0.45, 0.32),
  tipBg: rgb(0.93, 0.95, 0.9),
  tipBorder: rgb(0.48, 0.56, 0.44),
  noteBg: rgb(0.95, 0.94, 0.91),
  noteBorder: rgb(0.65, 0.62, 0.57),
  white: rgb(1, 1, 1),
  dark: rgb(0.13, 0.12, 0.11),
};

function wrapText(text, font, size, maxWidth) {
  const lines = [];
  for (const paragraph of String(text ?? "").split("\n")) {
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

export async function renderGuidePdf({ title, categoryName, objectives = [], durationLabel, sections = [] }) {
  const pdf = await PDFDocument.create();
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };

  const ctx = { pdf, fonts, page: null, y: 0, pageNum: 0, sectionTitle: "", guideTitle: title };

  drawCoverPage(ctx, { title, categoryName, objectives, durationLabel });
  drawTocPage(ctx, { sections });

  for (const section of sections) {
    startSectionPage(ctx, section.title);
    for (const block of section.blocks || []) {
      drawBlock(ctx, block);
    }
  }

  return pdf.save();
}

// ── Page scaffolding ────────────────────────────────────────────────────

function addContentPage(ctx) {
  ctx.page = ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
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

function startSectionPage(ctx, sectionTitle) {
  ctx.sectionTitle = sectionTitle;
  addContentPage(ctx);
  const titleLines = wrapText(sectionTitle, ctx.fonts.bold, 22, CONTENT_WIDTH);
  for (const line of titleLines) {
    ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size: 22, font: ctx.fonts.bold, color: COLORS.ink });
    ctx.y -= 28;
  }
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y + 6 }, end: { x: MARGIN + 60, y: ctx.y + 6 }, thickness: 2, color: COLORS.accent });
  ctx.y -= 18;
}

// ── Cover + table of contents ───────────────────────────────────────────

function drawCoverPage(ctx, { title, categoryName, objectives, durationLabel }) {
  const page = ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.pageNum += 1;
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: COLORS.dark });
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 10, width: PAGE_WIDTH, height: 10, color: COLORS.accent });

  let y = PAGE_HEIGHT - 170;

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

function drawBlock(ctx, block) {
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
    default:
      return;
  }
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
  const colWidth = CONTENT_WIDTH / colCount;
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
    }
    cells.forEach((cell, ci) => {
      const lines = wrapText(cell, ctx.fonts.regular, fontSize, colWidth - cellPad * 2);
      let cy = rowTop - cellPad - fontSize;
      for (const line of lines) {
        ctx.page.drawText(line, {
          x: MARGIN + ci * colWidth + cellPad,
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
