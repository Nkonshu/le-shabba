"use client";

import { useTranslations } from "next-intl";
import { DownloadSimple } from "@phosphor-icons/react";

// Export .xlsx 100% côté client (aucune donnée supplémentaire renvoyée au serveur) — construit un
// classeur à partir des lignes déjà chargées dans la page, pour une présentation à un partenaire.
export function ExportExcelButton({
  rows,
  filename,
}: {
  rows: Record<string, string | number>[];
  filename: string;
}) {
  const t = useTranslations("admin");

  async function exportExcel() {
    if (rows.length === 0) return;
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Le Shabba");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  return (
    <button
      onClick={exportExcel}
      disabled={rows.length === 0}
      className="flex min-h-11 items-center gap-2 rounded-xl border border-neutral-200 px-3 text-sm font-medium disabled:opacity-50 dark:border-neutral-800"
    >
      <DownloadSimple size={16} />
      {t("statsExportExcel")}
    </button>
  );
}
