"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";
import { useFeatureFlag } from "@/src/hooks/use-feature-flag";

type Country = { id: string; code: string; name: string };
type EducationLevel = { id: string; label: string; sort_order: number };

const TOTAL_STEPS = 4;

export function OnboardingWizard({
  locale,
  countries,
  initialReferralCode,
}: {
  locale: string;
  countries: Country[];
  initialReferralCode: string;
}) {
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const parrainageEnabled = useFeatureFlag("gamification.parrainage", true);

  const [step, setStep] = useState(1);
  const [countryId, setCountryId] = useState("");
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(false);
  const [levelId, setLevelId] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectLanguage(newLocale: string) {
    if (newLocale !== locale) {
      router.replace("/onboarding", { locale: newLocale });
      return;
    }
    setStep(2);
  }

  async function selectCountry(id: string) {
    setCountryId(id);
    setLevelId("");
    setLevelsLoading(true);
    const { data } = await supabase
      .from("education_levels")
      .select("id, label, sort_order")
      .eq("country_id", id)
      .order("sort_order");
    setLevels(data ?? []);
    setLevelsLoading(false);
  }

  function handleAvatarChange(file: File | null) {
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  }

  async function finish() {
    setSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(tCommon("genericError"));
      setSubmitting(false);
      return;
    }

    let avatarUrl: string | null = null;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile);
      if (uploadError) {
        setError(uploadError.message);
        setSubmitting(false);
        return;
      }
      avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    // Code de parrainage optionnel (Annexe A.1/A.4) : le code est l'id du parrain lui-même, un code
    // invalide ou auto-référencé est ignoré silencieusement plutôt que de bloquer l'inscription.
    let referredBy: string | null = null;
    const trimmedReferral = referralCode.trim();
    if (parrainageEnabled && trimmedReferral && trimmedReferral !== user.id) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", trimmedReferral)
        .maybeSingle();
      if (referrer) referredBy = referrer.id;
    }

    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: pseudo,
      country_id: countryId,
      level_id: levelId,
      avatar_url: avatarUrl,
      locale,
      referred_by: referredBy,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    // Un seul appel, pas de router.push("/") en parallèle : /onboarding fait déjà
    // `if (profile) redirect(...)` côté serveur, refresh() suffit à le déclencher une fois le
    // profil créé, sans risquer que les deux navigations se marchent dessus.
    router.refresh();
  }

  const canGoNext =
    (step === 1 && true) ||
    (step === 2 && countryId.length > 0) ||
    (step === 3 && levelId.length > 0) ||
    (step === 4 && pseudo.trim().length > 0);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
        {t("step", { current: step, total: TOTAL_STEPS })}
      </p>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-black">{t("languageTitle")}</h1>
            <p className="mt-1 text-sm text-neutral-500">{t("languageSubtitle")}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => selectLanguage("fr")}
              className={`min-h-11 flex-1 rounded-xl border px-4 font-medium ${
                locale === "fr"
                  ? "border-accent-blue bg-blue-50 dark:bg-blue-950"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              Français
            </button>
            <button
              onClick={() => selectLanguage("en")}
              className={`min-h-11 flex-1 rounded-xl border px-4 font-medium ${
                locale === "en"
                  ? "border-accent-blue bg-blue-50 dark:bg-blue-950"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              English
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-black">{t("countryTitle")}</h1>
          <select
            value={countryId}
            onChange={(e) => selectCountry(e.target.value)}
            className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <option value="" disabled>
              {tCommon("selectPlaceholder")}
            </option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-black">{t("levelTitle")}</h1>
          <select
            value={levelId}
            onChange={(e) => setLevelId(e.target.value)}
            disabled={levelsLoading || levels.length === 0}
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
          {!levelsLoading && levels.length === 0 && (
            <p className="text-sm text-red-600 dark:text-red-400">{t("countryNotConfigured")}</p>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-black">{t("pseudoTitle")}</h1>
          <input
            type="text"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder={t("pseudoPlaceholder")}
            className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
          />
          <div className="flex items-center gap-3">
            {avatarPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
              />
            )}
            <label className="min-h-11 cursor-pointer rounded-xl border border-neutral-200 px-4 text-sm font-medium leading-[2.75rem] dark:border-neutral-800">
              {t("avatarLabel")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          {parrainageEnabled && (
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder={t("referralLabel")}
              className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
            />
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="min-h-11 rounded-xl border border-neutral-200 px-4 font-medium dark:border-neutral-800"
          >
            {tCommon("back")}
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext}
            className="min-h-11 flex-1 rounded-xl bg-accent-blue px-4 font-medium text-white disabled:opacity-50"
          >
            {tCommon("next")}
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={!canGoNext || submitting}
            className="min-h-11 flex-1 rounded-xl bg-accent-blue px-4 font-medium text-white disabled:opacity-50"
          >
            {t("finish")}
          </button>
        )}
      </div>
    </div>
  );
}
