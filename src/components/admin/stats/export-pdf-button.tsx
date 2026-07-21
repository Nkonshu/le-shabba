"use client";

import { useTranslations } from "next-intl";
import { FilePdf } from "@phosphor-icons/react";

// Fond des graphes capturés : ils sont dessinés (recharts) avec des couleurs de grille/texte pensées
// pour un fond sombre (l'app est en thème sombre par défaut) — repartir sur du blanc les rendrait
// à peine lisibles, donc on garde le même fond sombre que celui de l'écran plutôt que la page
// blanche habituelle d'un PDF.
const CHART_BG = "#0a0a0a";

function svgToPngDataUrl(svg: SVGSVGElement): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const rect = svg.getBoundingClientRect();
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("no canvas context"));
        return;
      }
      ctx.fillStyle = CHART_BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL("image/png"), width: rect.width, height: rect.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("svg image load failed"));
    };
    img.src = url;
  });
}

async function captureCharts(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  const cards = Array.from(container.children) as HTMLElement[];
  const results: { title: string; dataUrl: string; width: number; height: number }[] = [];
  for (const card of cards) {
    // Les camemberts ont une <Legend> dont chaque entrée rend elle-même un <svg class="recharts-surface">
    // de 14x14 (icône de couleur) — même classe que le vrai graphe, donc un simple querySelector("svg")
    // ou même querySelector("svg.recharts-surface") attrape la première icône au lieu du graphe. On
    // prend celui avec la plus grande surface parmi tous les candidats, plutôt que le premier trouvé.
    const svgs = Array.from(card.querySelectorAll("svg.recharts-surface")) as SVGSVGElement[];
    const svg = svgs.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return rb.width * rb.height - ra.width * ra.height;
    })[0];
    if (!svg) continue;
    const titleEl = card.querySelector("span");
    const title = titleEl?.textContent ?? "";
    try {
      const captured = await svgToPngDataUrl(svg);
      results.push({ title, ...captured });
    } catch {
      // Un graphe illisible (pas de données, pas de svg valide) ne doit pas faire échouer tout
      // l'export — on l'ignore simplement plutôt que de bloquer le reste du rapport.
    }
  }
  return results;
}

// Export PDF 100% côté client, dans le même esprit que ExportExcelButton : construit un rapport
// présentable (titre, tableau de données, graphes en image) à partir de ce qui est déjà affiché à
// l'écran, sans aller rechercher quoi que ce soit côté serveur.
export function ExportPdfButton({
  rows,
  filename,
  reportTitle,
  chartsContainerId,
}: {
  rows: Record<string, string | number>[];
  filename: string;
  reportTitle: string;
  chartsContainerId: string;
}) {
  const t = useTranslations("admin");

  async function exportPdf() {
    const [{ default: JsPDF }, autoTable, charts] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
      captureCharts(chartsContainerId),
    ]);

    const doc = new JsPDF({ unit: "pt" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;

    doc.setFontSize(18);
    doc.text(reportTitle, margin, 50);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(new Date().toLocaleDateString("fr-FR"), margin, 68);
    doc.setTextColor(0);

    let cursorY = 90;

    for (const chart of charts) {
      const maxWidth = pageWidth - margin * 2;
      const ratio = chart.width > 0 ? chart.height / chart.width : 0.5;
      const drawWidth = Math.min(maxWidth, chart.width);
      const drawHeight = drawWidth * ratio;

      if (cursorY + drawHeight + 24 > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        cursorY = margin;
      }

      doc.setFontSize(11);
      doc.text(chart.title, margin, cursorY);
      cursorY += 10;
      doc.addImage(chart.dataUrl, "PNG", margin, cursorY, drawWidth, drawHeight);
      cursorY += drawHeight + 24;
    }

    if (rows.length > 0) {
      if (cursorY > doc.internal.pageSize.getHeight() - margin - 60) {
        doc.addPage();
        cursorY = margin;
      }
      const headers = Object.keys(rows[0]);
      const body = rows.map((r) => headers.map((h) => String(r[h] ?? "")));
      autoTable.default(doc, {
        startY: cursorY,
        head: [headers],
        body,
        styles: { fontSize: 8 },
        margin: { left: margin, right: margin },
      });
    }

    doc.save(`${filename}.pdf`);
  }

  return (
    <button
      onClick={exportPdf}
      disabled={rows.length === 0}
      className="flex min-h-11 items-center gap-2 rounded-xl border border-neutral-200 px-3 text-sm font-medium disabled:opacity-50 dark:border-neutral-800"
    >
      <FilePdf size={16} />
      {t("statsExportPdf")}
    </button>
  );
}
