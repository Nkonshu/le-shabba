import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { getCurrentProfile } from "@/src/lib/dal";
import { createClient } from "@/src/utils/supabase/server";
import { signOut } from "@/src/app/actions/auth";
import { LanguageSwitcher } from "@/src/components/layout/language-switcher";
import { NotificationBell } from "@/src/components/layout/notification-bell";
import { SearchBar } from "@/src/components/layout/search-bar";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const profile = await getCurrentProfile();

  let initialNotifications: Awaited<ReturnType<typeof fetchNotifications>> = [];
  if (profile) {
    initialNotifications = await fetchNotifications(profile.id);
  }

  return (
    <header className="border-b border-neutral-100 dark:border-neutral-900">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-black">
          Le Shabba
        </Link>
        <div className="flex items-center gap-1">
        <SearchBar />
        <LanguageSwitcher />
        {profile ? (
          <>
            <NotificationBell userId={profile.id} initialNotifications={initialNotifications} />
            {["admin", "super_admin"].includes(profile.role) && (
              <Link
                href="/admin"
                className="min-h-11 rounded-xl px-3 text-sm font-medium leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
              >
                {t("admin")}
              </Link>
            )}
            {(["admin", "super_admin"].includes(profile.role) || profile.genie_points >= 1200) && (
              <Link
                href="/moderation"
                className="min-h-11 rounded-xl px-3 text-sm font-medium leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
              >
                {t("moderation")}
              </Link>
            )}
            <Link
              href={`/profil/${profile.id}`}
              className="min-h-11 rounded-xl px-3 text-sm font-medium leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
            >
              {t("profile")}
            </Link>
            <Link
              href="/profil/moi/parametres"
              className="min-h-11 rounded-xl px-3 text-sm font-medium leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
            >
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
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 text-sm">
        <Link
          href="/cours"
          className="min-h-11 shrink-0 rounded-xl px-3 leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
        >
          {t("courses")}
        </Link>
        <Link
          href="/epreuves"
          className="min-h-11 shrink-0 rounded-xl px-3 leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
        >
          {t("exams")}
        </Link>
        <Link
          href="/fiches-revision"
          className="min-h-11 shrink-0 rounded-xl px-3 leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
        >
          {t("revisionSheets")}
        </Link>
        <Link
          href="/forum"
          className="min-h-11 shrink-0 rounded-xl px-3 leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
        >
          {t("forum")}
        </Link>
        <Link
          href="/demandes"
          className="min-h-11 shrink-0 rounded-xl px-3 leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
        >
          {t("requests")}
        </Link>
        <Link
          href="/participants"
          className="min-h-11 shrink-0 rounded-xl px-3 leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
        >
          {t("participants")}
        </Link>
        {profile && (
          <Link
            href="/favoris"
            className="min-h-11 shrink-0 rounded-xl px-3 leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
          >
            {t("favorites")}
          </Link>
        )}
        <Link
          href="/telechargements"
          className="min-h-11 shrink-0 rounded-xl px-3 leading-[2.75rem] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
        >
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
