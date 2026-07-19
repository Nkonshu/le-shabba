// Règles transversales de formatage des nombres (C.12) et des points (C.5).

// C.12 : compte < 1000 -> exact ; compte >= 1000 -> compacté localisé ("1,2 k" fr / "1.2k" en).
export function formatCompactNumber(value: number, locale: string) {
  if (value < 1000) return new Intl.NumberFormat(locale).format(value);
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

// C.5 : les points exacts d'un pedigrée restent lisibles jusqu'à 9 999 ("3 842 pts"), seuls les
// comptes à 5 chiffres et plus basculent en format compacté — un seuil plus haut que la règle
// générale C.12 (1000), car un chiffre de réputation reste un repère de statut plus longtemps.
export function formatPoints(value: number, locale: string) {
  if (value < 10000) return new Intl.NumberFormat(locale).format(value);
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
