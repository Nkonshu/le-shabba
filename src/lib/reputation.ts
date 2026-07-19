// Barème de réputation (Annexe A.4 : "seuils et privilèges = tableau déjà fixé en conception produit
// (0 / 250 / 1 200 / 3 500 / 8 000 / 20 000+)"). Seuls "Tuteur" (3 500) et "Major de Promo" (8 000)
// sont nommés dans le document ; les autres paliers sont sans nom fixé — libellés choisis ici pour
// donner une progression lisible, à ajuster librement si le porteur de projet en fixe d'autres.
export const RANKS = [
  { key: "beginner", min: 0 },
  { key: "curious", min: 250 },
  { key: "sentinel", min: 1200 },
  { key: "tutor", min: 3500 },
  { key: "valedictorian", min: 8000 },
  { key: "legend", min: 20000 },
] as const;

export type RankKey = (typeof RANKS)[number]["key"];

export const REPORT_THRESHOLD = 1200;
export const MODERATE_THRESHOLD = 3500;
export const WIKI_EDIT_THRESHOLD = 3500;
export const CLOSE_DUPLICATE_THRESHOLD = 8000;
export const TUTOR_THRESHOLD = 8000;

export function getRank(points: number) {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (points >= RANKS[i].min) index = i;
  }
  const current = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  return {
    key: current.key as RankKey,
    min: current.min,
    next: next ? { key: next.key as RankKey, min: next.min, remaining: next.min - points } : null,
  };
}
