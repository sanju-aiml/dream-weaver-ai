import type { Deck } from "./assets.functions";

const INK = "141816";
const CREAM = "F6F1E4";
const VERMILION = "E0451F";
const YELLOW = "F2C230";

function safe(name: string) {
  return name.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "dreamforge";
}

/** Bold-editorial PPTX built in the browser. */
export async function downloadPptx(deck: Deck) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  const title = pptx.addSlide();
  title.background = { color: CREAM };
  title.addShape("rect", { x: 0, y: 0, w: 0.35, h: 5.63, fill: { color: VERMILION } });
  title.addText(deck.title, {
    x: 0.9,
    y: 1.5,
    w: 8.3,
    h: 1.8,
    fontSize: 44,
    bold: true,
    color: INK,
  });
  title.addText(deck.subtitle, { x: 0.9, y: 3.3, w: 8.3, h: 0.8, fontSize: 18, color: INK });
  title.addText("DREAMFORGE AI", {
    x: 0.9,
    y: 4.6,
    w: 4,
    h: 0.4,
    fontSize: 11,
    charSpacing: 4,
    color: VERMILION,
  });

  deck.slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    s.background = { color: CREAM };
    s.addShape("rect", { x: 0, y: 0, w: 10, h: 0.14, fill: { color: YELLOW } });
    s.addText(slide.heading, {
      x: 0.6,
      y: 0.5,
      w: 8.8,
      h: 0.9,
      fontSize: 30,
      bold: true,
      color: INK,
    });
    s.addText(
      (slide.bullets ?? []).map((b) => ({ text: b, options: { bullet: true } })),
      { x: 0.7, y: 1.6, w: 8.6, h: 3.2, fontSize: 18, color: INK, lineSpacingMultiple: 1.3 },
    );
    s.addText(`${i + 2}`, { x: 9.2, y: 5.05, w: 0.6, h: 0.3, fontSize: 10, color: INK });
    if (slide.notes) s.addNotes(slide.notes);
  });

  await pptx.writeFile({ fileName: `${safe(deck.title)}-slides.pptx` });
}

/** Rasterises a DOM node (the poster preview) to a PNG download. */
export async function downloadPng(node: HTMLElement, filename: string) {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#F6F1E4" });
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${safe(filename)}.png`;
  link.click();
}

/** Same node, as a single-page A-series PDF. */
export async function downloadNodePdf(node: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#F6F1E4" });
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? "landscape" : "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
  });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(`${safe(filename)}.pdf`);
}

/** Plain-text/markdown report as a paginated PDF. */
export async function downloadTextPdf(text: string, filename: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const width = pdf.internal.pageSize.getWidth() - margin * 2;
  const height = pdf.internal.pageSize.getHeight() - margin * 2;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const lines = pdf.splitTextToSize(text.replace(/\*\*/g, ""), width) as string[];
  let y = margin;
  for (const line of lines) {
    if (y > height) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(line, margin, y);
    y += 15;
  }
  pdf.save(`${safe(filename)}.pdf`);
}
