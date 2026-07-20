"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "@phosphor-icons/react";
import { Link } from "@/src/i18n/navigation";
import { StatLineChart } from "@/src/components/admin/stats/charts";
import { periodRange, type StatsPeriod } from "@/src/lib/stats";
import type { DrilldownRow } from "@/src/app/api/admin/growth-drilldown/route";

export function GrowthChartWithDrilldown({
  metric,
  title,
  data,
  emptyLabel,
  period,
  xCountry,
  xLevel,
  xUser,
}: {
  metric: string;
  title: string;
  data: { label: string; value: number }[];
  emptyLabel: string;
  period: StatsPeriod;
  xCountry?: string;
  xLevel?: string;
  xUser?: string;
}) {
  const t = useTranslations("adminGrowth");
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const [rows, setRows] = useState<DrilldownRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePointClick(label: string) {
    setOpenLabel(label);
    setRows(null);
    setLoading(true);
    const { start, end } = periodRange(label, period);
    const params = new URLSearchParams({ metric, start, end });
    if (xCountry) params.set("xCountry", xCountry);
    if (xLevel) params.set("xLevel", xLevel);
    if (xUser) params.set("xUser", xUser);
    try {
      const res = await fetch(`/api/admin/growth-drilldown?${params.toString()}`);
      const json = await res.json();
      setRows(json.rows ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <StatLineChart title={title} data={data} emptyLabel={emptyLabel} onPointClick={handlePointClick} />

      {openLabel ? (
        <div className="flex flex-col gap-1.5 rounded-xl border border-accent-blue/30 bg-accent-blue/5 p-3 dark:bg-accent-blue/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-accent-blue">{openLabel}</span>
            <button
              onClick={() => setOpenLabel(null)}
              aria-label="close"
              className="flex min-h-6 min-w-6 items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
            >
              <X size={14} />
            </button>
          </div>
          {loading ? (
            <p className="py-2 text-xs text-neutral-400">{t("drilldownLoading")}</p>
          ) : (rows ?? []).length === 0 ? (
            <p className="py-2 text-xs text-neutral-400">{t("drilldownEmpty")}</p>
          ) : (
            <div className="flex max-h-52 flex-col gap-1 overflow-y-auto">
              {(rows ?? []).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                  {r.href ? (
                    <Link href={r.href} className="truncate text-accent-blue hover:underline">
                      {r.label}
                    </Link>
                  ) : (
                    <span className="truncate">{r.label}</span>
                  )}
                  {r.sublabel && <span className="shrink-0 text-neutral-400">{r.sublabel}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-neutral-400">{t("drilldownHint")}</p>
      )}
    </div>
  );
}
