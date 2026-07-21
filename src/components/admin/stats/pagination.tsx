import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";

const PAGE_SIZE = 25;

export { PAGE_SIZE };

// Composant de pagination partagé par toutes les grosses listes de l'admin (utilisateurs, journal,
// anomalies, écoles, partenariats...) — de simples liens qui changent un seul paramètre d'URL
// (`pageParam`) tout en conservant tous les autres filtres actifs déjà présents dans `sp`.
export async function Pagination({
  sp,
  pageParam,
  page,
  totalPages,
}: {
  sp: Record<string, string | undefined>;
  pageParam: string;
  page: number;
  totalPages: number;
}) {
  const t = await getTranslations("common");
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (value) params.set(key, value);
    }
    params.set(pageParam, String(p));
    return `/admin?${params.toString()}`;
  }

  const linkClass =
    "flex min-h-9 items-center justify-center rounded-lg border border-neutral-200 px-3 text-xs font-medium dark:border-neutral-800";
  const disabledClass = "flex min-h-9 items-center justify-center rounded-lg px-3 text-xs font-medium text-neutral-300 dark:text-neutral-700";

  return (
    <div className="flex items-center justify-center gap-3 pt-1">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkClass}>
          {t("previous")}
        </Link>
      ) : (
        <span className={disabledClass}>{t("previous")}</span>
      )}
      <span className="text-xs text-neutral-400">{t("pageIndicator", { page, total: totalPages })}</span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={linkClass}>
          {t("next")}
        </Link>
      ) : (
        <span className={disabledClass}>{t("next")}</span>
      )}
    </div>
  );
}
