import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { getCurrentProfile } from "@/src/lib/dal";
import { createClient } from "@/src/utils/supabase/server";
import { signOut } from "@/src/app/actions/auth";
import { LanguageSwitcher } from "@/src/components/layout/language-switcher";
import { NotificationBell } from "@/src/components/layout/notification-bell";
import { SearchBar } from "@/src/components/layout/search-bar";

const NAV_LINK_CLASS =
  "min-h-11 shrink-0 rounded-xl px-3 leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50 md:leading-normal md:py-2.5";

// Barre horizontale en haut sur mobile (la place verticale manque sous md), colonne latérale
// gauche persistante à partir de md — disposition Stack Overflow, même identité visuelle.
export async function SiteHeader() {
  const t = await getTranslations("nav");
  const profile = await getCurrentProfile();

  let initialNotifications: Awaited<ReturnType<typeof fetchNotifications>> = [];
  if (profile) {
    initialNotifications = await fetchNotifications(profile.id);
  }

  return (
    <header className="border-b border-neutral-100 dark:border-neutral-900 md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-3 md:flex-col md:items-stretch md:gap-2">
        <Link href="/" className="text-lg font-black">
          Le Shabba
        </Link>
        <div className="flex items-center gap-1 md:w-full md:flex-col md:items-stretch md:gap-1">
          <SearchBar />
          <LanguageSwitcher />
          {profile ? (
            <>
              <NotificationBell userId={profile.id} initialNotifications={initialNotifications} />
              {["admin", "super_admin"].includes(profile.role) && (
                <Link href="/admin" className={NAV_LINK_CLASS}>
                  {t("admin")}
                </Link>
              )}
              {(["admin", "super_admin"].includes(profile.role) || profile.genie_points >= 1200) && (
                <Link href="/moderation" className={NAV_LINK_CLASS}>
                  {t("moderation")}
                </Link>
              )}
              <Link href={`/profil/${profile.id}`} className={NAV_LINK_CLASS}>
                {t("profile")}
              </Link>
              <Link href="/profil/moi/parametres" className={NAV_LINK_CLASS}>
                {t("settings")}
              </Link>
              <form action={signOut} className="md:w-full">
                <button className="min-h-11 w-full rounded-xl px-3 text-left text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50">
                  {t("logout")}
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="min-h-11 rounded-xl bg-accent-blue px-4 text-center text-sm font-medium leading-[2.75rem] text-white md:leading-normal md:py-2.5"
            >
              {t("login")}
            </Link>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 text-sm md:flex-col md:gap-0.5 md:overflow-visible md:px-3 md:pb-4">
        <Link href="/cours" className={NAV_LINK_CLASS}>
          {t("courses")}
        </Link>
        <Link href="/epreuves" className={NAV_LINK_CLASS}>
          {t("exams")}
        </Link>
        <Link href="/fiches-revision" className={NAV_LINK_CLASS}>
          {t("revisionSheets")}
        </Link>
        <Link href="/forum" className={NAV_LINK_CLASS}>
          {t("forum")}
        </Link>
        <Link href="/demandes" className={NAV_LINK_CLASS}>
          {t("requests")}
        </Link>
        <Link href="/participants" className={NAV_LINK_CLASS}>
          {t("participants")}
        </Link>
        {profile && (
          <Link href="/favoris" className={NAV_LINK_CLASS}>
            {t("favorites")}
          </Link>
        )}
        <Link href="/telechargements" className={NAV_LINK_CLASS}>
          {t("downloads")}
        </Link>
      </nav>
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
