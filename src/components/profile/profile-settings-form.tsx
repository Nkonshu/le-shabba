"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";
import { isCurrentlyBanned, type Profile } from "@/src/lib/profile";

type Country = { id: string; code: string; name: string };
type EducationLevel = { id: string; label: string; sort_order: number };

const BIO_MAX_LENGTH = 200;

export function ProfileSettingsForm({
  locale,
  profile,
  countries,
}: {
  locale: string;
  profile: Profile;
  countries: Country[];
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const banned = isCurrentlyBanned(profile);

  const [pseudo, setPseudo] = useState(profile.full_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [countryId, setCountryId] = useState(profile.country_id ?? "");
  const [levelId, setLevelId] = useState(profile.level_id ?? "");
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);

  useEffect(() => {
    if (!countryId) return;
    supabase
      .from("education_levels")
      .select("id, label, sort_order")
      .eq("country_id", countryId)
      .order("sort_order")
      .then(({ data }) => setLevels(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId]);

  async function save(fields: Record<string, unknown>) {
    if (banned) return;
    const { error } = await supabase.from("profiles").update(fields).eq("id", profile.id);
    if (error) {
      toast.error(t("saveError"));
      return;
    }
    toast.success(t("saved"));
  }

  async function handleCountryChange(id: string) {
    setCountryId(id);
    setLevelId("");
    await save({ country_id: id, level_id: null });
  }

  async function handleLevelChange(id: string) {
    setLevelId(id);
    await save({ level_id: id });
  }

  async function handleLocaleChange(newLocale: string) {
    await save({ locale: newLocale });
    router.replace("/profil/moi/parametres", { locale: newLocale });
  }

  async function handleAvatarChange(file: File | null) {
    if (!file || banned) return;
    const ext = file.name.split(".").pop();
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file);
    if (uploadError) {
      toast.error(t("saveError"));
      return;
    }
    const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    setAvatarUrl(publicUrl);
    await save({ avatar_url: publicUrl });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black">{t("title")}</h1>

      {banned && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {profile.banned_until
            ? tCommon("bannedTemporary", {
                date: new Date(profile.banned_until).toLocaleDateString(locale),
                reason: profile.ban_reason ?? "",
              })
            : tCommon("bannedPermanent")}
        </p>
      )}

      <div className="flex items-center gap-3">
        {avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
        )}
        <label className="min-h-11 cursor-pointer rounded-xl border border-neutral-200 px-4 text-sm font-medium leading-[2.75rem] dark:border-neutral-800">
          {t("avatarLabel")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={banned}
            onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("pseudoLabel")}
        <input
          type="text"
          value={pseudo}
          disabled={banned}
          onChange={(e) => setPseudo(e.target.value)}
          onBlur={() => save({ full_name: pseudo })}
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("bioLabel")}
        <textarea
          value={bio}
          disabled={banned}
          maxLength={BIO_MAX_LENGTH}
          onChange={(e) => setBio(e.target.value)}
          onBlur={() => save({ bio })}
          rows={3}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900"
        />
        <span className="text-[10px] text-neutral-400">
          {bio.length}/{BIO_MAX_LENGTH}
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("countryLabel")}
        <select
          value={countryId}
          disabled={banned}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900"
        >
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("levelLabel")}
        <select
          value={levelId}
          disabled={banned || levels.length === 0}
          onChange={(e) => handleLevelChange(e.target.value)}
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <option value="" disabled>
            {tCommon("selectPlaceholder")}
          </option>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("languageLabel")}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={banned}
            onClick={() => handleLocaleChange("fr")}
            className={`min-h-11 flex-1 rounded-xl border px-4 font-medium disabled:opacity-50 ${
              locale === "fr"
                ? "border-accent-blue bg-blue-50 dark:bg-blue-950"
                : "border-neutral-200 dark:border-neutral-800"
            }`}
          >
            Français
          </button>
          <button
            type="button"
            disabled={banned}
            onClick={() => handleLocaleChange("en")}
            className={`min-h-11 flex-1 rounded-xl border px-4 font-medium disabled:opacity-50 ${
              locale === "en"
                ? "border-accent-blue bg-blue-50 dark:bg-blue-950"
                : "border-neutral-200 dark:border-neutral-800"
            }`}
          >
            English
          </button>
        </div>
      </label>
    </div>
  );
}
