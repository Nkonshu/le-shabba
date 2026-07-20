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
