import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 612; // US Letter
const PAGE_HEIGHT = 792;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function wrapText(text, font, size, maxWidth) {
  const lines = [];
  for (const paragraph of text.split("\n")) {
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

export async function renderGuidePdf({ title, objectives = [], sections = [] }) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.11, 0.1, 0.09);
  const muted = rgb(0.45, 0.42, 0.38);
  const accent = rgb(0.71, 0.41, 0.25);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function newPage() {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  function ensureSpace(neededHeight) {
    if (y - neededHeight < MARGIN) newPage();
  }

  function drawLines(lines, { font = regular, size = 11, color = ink, lineGap = 5 } = {}) {
    const lineHeight = size + lineGap;
    for (const line of lines) {
      ensureSpace(lineHeight);
      if (line) page.drawText(line, { x: MARGIN, y, size, font, color });
      y -= lineHeight;
    }
  }

  // Title
  const titleLines = wrapText(title, bold, 26, CONTENT_WIDTH);
  drawLines(titleLines, { font: bold, size: 26, color: ink, lineGap: 8 });
  y -= 12;

  // Objectives
  if (objectives.length > 0) {
    ensureSpace(20);
    page.drawText("WHAT THIS GUIDE COVERS", { x: MARGIN, y, size: 10, font: bold, color: accent });
    y -= 20;
    for (const obj of objectives) {
      const lines = wrapText(`• ${obj}`, regular, 12, CONTENT_WIDTH - 12);
      drawLines(lines, { size: 12, color: muted, lineGap: 4 });
    }
    y -= 16;
  }

  // Sections
  for (const section of sections) {
    ensureSpace(40);
    y -= 8;
    const headingLines = wrapText(section.title, bold, 16, CONTENT_WIDTH);
    drawLines(headingLines, { font: bold, size: 16, color: ink, lineGap: 6 });
    y -= 6;

    const bodyLines = wrapText(section.body || "", regular, 11, CONTENT_WIDTH);
    drawLines(bodyLines, { size: 11, color: ink, lineGap: 5 });
    y -= 14;
  }

  return pdf.save();
}
