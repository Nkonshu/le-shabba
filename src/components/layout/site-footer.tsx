import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations("nav");

  return (
    <footer className="mt-auto border-t border-neutral-100 px-4 py-6 dark:border-neutral-900">
      <nav className="mx-auto flex max-w-5xl flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-400">
        <Link href="/aide" className="hover:text-neutral-900 dark:hover:text-neutral-50">
          {t("help")}
        </Link>
        <Link href="/a-propos" className="hover:text-neutral-900 dark:hover:text-neutral-50">
          {t("about")}
        </Link>
        <Link href="/contact" className="hover:text-neutral-900 dark:hover:text-neutral-50">
          {t("contact")}
        </Link>
        <Link href="/mentions-legales" className="hover:text-neutral-900 dark:hover:text-neutral-50">
          {t("legalNotice")}
        </Link>
        <Link href="/confidentialite" className="hover:text-neutral-900 dark:hover:text-neutral-50">
          {t("privacy")}
        </Link>
        <Link href="/cgu" className="hover:text-neutral-900 dark:hover:text-neutral-50">
          {t("terms")}
        </Link>
      </nav>
    </footer>
  );
}
