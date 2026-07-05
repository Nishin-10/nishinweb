/**
 * Client-side CV export. Both formats intentionally produce plain,
 * single-column, ATS-safe documents: no tables, no graphics, standard fonts.
 */
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { jsPDF } from "jspdf";

function isHeader(line: string): boolean {
  const t = line.trim();
  return (
    t.length > 1 &&
    t.length < 48 &&
    t === t.toUpperCase() &&
    /[A-Z]/.test(t) &&
    !t.startsWith("-")
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadDocx(text: string, filename: string) {
  const lines = text.split("\n");
  const children: Paragraph[] = lines.map((line) => {
    const t = line.trim();
    if (!t) return new Paragraph({ text: "" });
    if (isHeader(t)) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        children: [new TextRun({ text: t, bold: true, color: "222222" })],
      });
    }
    if (t.startsWith("- ") || t.startsWith("• ")) {
      return new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun(t.replace(/^[-•]\s*/, ""))],
      });
    }
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun(t)],
    });
  });

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } }, // 11pt
      },
    },
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
}

export function downloadPdf(text: string, filename: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight() - margin;
  let y = margin;

  for (const rawLine of text.split("\n")) {
    const t = rawLine.trim();
    const header = isHeader(t);
    doc.setFont("helvetica", header ? "bold" : "normal");
    doc.setFontSize(header ? 12.5 : 10.5);

    const wrapped = t ? doc.splitTextToSize(t, pageWidth) : [" "];
    for (const segment of wrapped) {
      if (y > pageHeight) {
        doc.addPage();
        y = margin;
      }
      doc.text(segment, margin, y);
      y += header ? 18 : 14;
    }
    if (header) y += 2;
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
