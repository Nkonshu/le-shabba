// Agrégation en mémoire (comptage/tri/regroupement par jour) — les volumes de ce projet restent
// modestes (VPS unique, pas de reporting temps réel à grande échelle), donc pas besoin de fonctions
// SQL GROUP BY dédiées par onglet : on filtre côté requête (date/catégorie) puis on agrège ici.

export function countByDay<T>(rows: T[], dateOf: (row: T) => string): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const day = dateOf(row).slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
}

export function countBy<T>(rows: T[], keyOf: (row: T) => string, limit = 8): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

export function sumBy<T>(
  rows: T[],
  keyOf: (row: T) => string,
  valueOf: (row: T) => number,
  limit = 8
): { label: string; value: number }[] {
  const sums = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row);
    sums.set(key, (sums.get(key) ?? 0) + valueOf(row));
  }
  return [...sums.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

export type StatsPeriod = "day" | "week" | "month" | "year";

// Bucket d'agrégation pour le tableau de bord "Croissance" — un seul sélecteur de période doit
// pouvoir regrouper indifféremment inscriptions, votes, commentaires, vues, etc.
function periodLabel(date: Date, period: StatsPeriod): string {
  if (period === "year") return String(date.getUTCFullYear());
  if (period === "month") return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  if (period === "week") {
    // Lundi de la semaine ISO contenant cette date, comme label (YYYY-MM-DD).
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - day + 1);
    return d.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export function countByPeriod<T>(
  rows: T[],
  dateOf: (row: T) => string,
  period: StatsPeriod
): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = periodLabel(new Date(dateOf(row)), period);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
}
