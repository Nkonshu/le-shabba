"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";
import { formatCompactNumber, formatPoints } from "@/src/lib/format";

type Category = "reputation" | "voters" | "editors" | "streaks";
type Window = "week" | "month" | "quarter" | "year" | "all";

const CATEGORIES: Category[] = ["reputation", "voters", "editors", "streaks"];
const WINDOWS: Window[] = ["week", "month", "quarter", "year", "all"];

type LeaderboardRow = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  badges_bronze: number;
  badges_argent: number;
  badges_or: number;
  current_streak: number;
  metric: number;
};

export function PantheonBoard({
  countries,
  levels,
  viewerId,
  viewerLevelId,
  viewerCountryId,
}: {
  countries: { id: string; code: string; name: string }[];
  levels: { id: string; label: string; country_id: string }[];
  viewerId: string | null;
  viewerLevelId: string | null;
  viewerCountryId: string | null;
}) {
  const t = useTranslations("participants");
  const locale = useLocale();

  const [category, setCategory] = useState<Category>("reputation");
  const [timeWindow, setTimeWindow] = useState<Window>("all");
  const [levelId, setLevelId] = useState("");
  const [countryId, setCountryId] = useState("");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  // `loading` est dérivé plutôt que posé par un setState synchrone en tête d'effet (interdit par
  // react-hooks/set-state-in-effect) : tant que la requête en cours ne correspond pas aux filtres
  // actuels, on est en chargement.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const levelsByCountry = useMemo(() => {
    const map = new Map<string, { id: string; label: string }[]>();
    for (const level of levels) {
      const list = map.get(level.country_id) ?? [];
      list.push(level);
      map.set(level.country_id, list);
    }
    return map;
  }, [levels]);

  const effectiveWindow = category === "streaks" ? "all" : timeWindow;
  const requestKey = `${category}:${effectiveWindow}:${levelId}:${countryId}`;
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase
      .rpc("get_leaderboard", {
        p_category: category,
        p_window: effectiveWindow,
        p_level_id: levelId || null,
        p_country_id: countryId || null,
        p_limit: 50,
      })
      .then(({ data }) => {
        if (active) {
          setRows((data as LeaderboardRow[] | null) ?? []);
          setLoadedKey(requestKey);
        }
      });
    return () => {
      active = false;
    };
  }, [category, effectiveWindow, levelId, countryId, requestKey]);

  const viewerRank = viewerId ? rows.findIndex((r) => r.user_id === viewerId) : -1;

  function formatMetric(row: LeaderboardRow) {
    if (category === "reputation") return t("metricReputation", { points: formatPoints(row.metric, locale) });
    if (category === "voters") return t("metricVoters", { count: formatCompactNumber(row.metric, locale) });
    if (category === "editors") return t("metricEditors", { count: formatCompactNumber(row.metric, locale) });
    return t("metricStreaks", { count: row.metric });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`min-h-9 shrink-0 rounded-lg px-3 text-sm font-medium ${
                category === c ? "bg-white shadow-sm dark:bg-neutral-800" : "text-neutral-500"
              }`}
            >
              {t(`categories.${c}`)}
            </button>
          ))}
        </div>

        {category !== "streaks" && (
          <div className="flex shrink-0 gap-3 overflow-x-auto text-sm">
            {WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`flex min-h-9 shrink-0 items-center px-1 ${
                  timeWindow === w
                    ? "font-medium text-accent-blue underline underline-offset-4"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
                }`}
              >
                {t(`windows.${w}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={countryId}
          onChange={(e) => {
            setCountryId(e.target.value);
            setLevelId("");
          }}
          className="min-h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <option value="">{t("allCountries")}</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.id === viewerCountryId ? ` (${t("mine")})` : ""}
            </option>
          ))}
        </select>
        <select
          value={levelId}
          onChange={(e) => setLevelId(e.target.value)}
          className="min-h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <option value="">{t("allLevels")}</option>
          {(countryId ? (levelsByCountry.get(countryId) ?? []) : levels).map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
              {l.id === viewerLevelId ? ` (${t("mine")})` : ""}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-neutral-400">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-900">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {rows.map((row, index) => (
            <Link
              key={row.user_id}
              href={`/profil/${row.user_id}`}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                row.user_id === viewerId
                  ? "border-accent-blue bg-blue-50/50 dark:bg-blue-950/30"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <span
                className={`w-6 shrink-0 text-center font-black ${
                  index === 0 ? "text-amber-500" : index === 1 ? "text-neutral-400" : index === 2 ? "text-orange-700" : "text-neutral-300"
                }`}
              >
                {index + 1}
              </span>
              {row.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-800" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{row.full_name ?? t("anonymous")}</p>
                <p className="text-[10px] text-neutral-400">
                  {row.badges_or > 0 && `🥇${row.badges_or} `}
                  {row.badges_argent > 0 && `🥈${row.badges_argent} `}
                  {row.badges_bronze > 0 && `🥉${row.badges_bronze}`}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-neutral-500">{formatMetric(row)}</span>
            </Link>
          ))}
        </div>
      )}

      {viewerId && viewerRank === -1 && rows.length > 0 && (
        <p className="text-center text-[10px] text-neutral-400">{t("notInTopRanks")}</p>
      )}
      {viewerRank >= 0 && (
        <p className="text-center text-[10px] text-neutral-400">{t("yourPosition", { rank: viewerRank + 1 })}</p>
      )}
    </div>
  );
}
