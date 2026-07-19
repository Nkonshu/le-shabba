import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { getCurrentProfile } from "@/src/lib/dal";
import { createClient } from "@/src/utils/supabase/server";
import { signOut } from "@/src/app/actions/auth";
import { LanguageSwitcher } from "@/src/components/layout/language-switcher";
import { NotificationBell } from "@/src/components/layout/notification-bell";
import { SearchBar } from "@/src/components/layout/search-bar";

const META_LINK_CLASS =
  "min-h-11 shrink-0 rounded-xl px-2 text-sm leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50";
const ACCOUNT_LINK_CLASS =
  "min-h-11 shrink-0 rounded-xl px-3 text-sm font-medium leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50";

// Barre du haut uniquement (logo, liens méta, recherche centrale, zone de compte) — la nav
// structurelle (Cours/Forum/...) vit désormais dans SidebarNav, une colonne séparée.
export async function SiteHeader() {
  const t = await getTranslations("nav");
  const profile = await getCurrentProfile();

  let initialNotifications: Awaited<ReturnType<typeof fetchNotifications>> = [];
  if (profile) {
    initialNotifications = await fetchNotifications(profile.id);
  }

  return (
    <header className="border-b border-neutral-100 dark:border-neutral-900">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 text-lg font-black">
          Le Shabba
        </Link>

        <nav className="hidden shrink-0 items-center gap-1 sm:flex">
          <Link href="/a-propos" className={META_LINK_CLASS}>
            {t("about")}
          </Link>
          <Link href="/aide" className={META_LINK_CLASS}>
            {t("help")}
          </Link>
          <Link href="/contact" className={META_LINK_CLASS}>
            {t("contact")}
          </Link>
        </nav>

        <SearchBar />

        <div className="flex shrink-0 items-center gap-1">
          <LanguageSwitcher />
          {profile ? (
            <>
              <NotificationBell userId={profile.id} initialNotifications={initialNotifications} />
              {["admin", "super_admin"].includes(profile.role) && (
                <Link href="/admin" className={ACCOUNT_LINK_CLASS}>
                  {t("admin")}
                </Link>
              )}
              {(["admin", "super_admin"].includes(profile.role) || profile.genie_points >= 1200) && (
                <Link href="/moderation" className={ACCOUNT_LINK_CLASS}>
                  {t("moderation")}
                </Link>
              )}
              <Link href={`/profil/${profile.id}`} className={ACCOUNT_LINK_CLASS}>
                {t("profile")}
              </Link>
              <Link href="/profil/moi/parametres" className={ACCOUNT_LINK_CLASS}>
                {t("settings")}
              </Link>
              <form action={signOut}>
                <button className="min-h-11 rounded-xl px-3 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50">
                  {t("logout")}
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="min-h-11 rounded-xl bg-accent-blue px-4 text-sm font-medium leading-[2.75rem] text-white"
            >
              {t("login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

async function fetchNotifications(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, target_id, payload, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}
