import { PDFDocument } from "pdf-lib";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// A4 retrato
const A4_W = 595.28;
const A4_H = 841.89;
const PT_PER_CM = 28.346;

const MARGIN_V = 0.5 * PT_PER_CM; // 0.5cm top e bottom
const MARGIN_H = 0;               // sem margem lateral
const ROWS = 3;

const imgBytes = readFileSync(join(__dirname, "../public/figurinhacompleta.png"));

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([A4_W, A4_H]);

const img = await pdfDoc.embedPng(imgBytes);
const { width: imgW, height: imgH } = img;
const ratio = imgW / imgH;

const availW = A4_W - 2 * MARGIN_H;
const availH = A4_H - 2 * MARGIN_V;

const cellH = availH / ROWS;
const cellW = cellH * ratio;

const cols = Math.floor((availW + 1) / cellW);
const totalW = cols * cellW;
const startX = (A4_W - totalW) / 2;
const startY = A4_H - MARGIN_V;

for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < cols; col++) {
    page.drawImage(img, {
      x: startX + col * cellW,
      y: startY - (row + 1) * cellH,
      width: cellW,
      height: cellH,
    });
  }
}

const out = join(__dirname, "../public/figurinhacompleta-3linhas.pdf");
writeFileSync(out, await pdfDoc.save());
console.log(`✓ PDF gerado: ${out} (${cols} colunas × ${ROWS} linhas)`);
