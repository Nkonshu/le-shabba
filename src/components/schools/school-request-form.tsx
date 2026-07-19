"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";

type Country = { id: string; code: string; name: string };

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function SchoolRequestForm({
  requesterId,
  countries,
}: {
  requesterId: string;
  countries: Country[];
}) {
  const t = useTranslations("schools");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const supabase = createClient();

  const [schoolName, setSchoolName] = useState("");
  const [countryId, setCountryId] = useState("");
  const [estimatedStudents, setEstimatedStudents] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!schoolName.trim() || !subdomain.trim()) return;
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("school_requests").insert({
      requester_id: requesterId,
      school_name: schoolName.trim(),
      country_id: countryId || null,
      estimated_students: estimatedStudents ? Number(estimatedStudents) : null,
      desired_subdomain: slugify(subdomain),
    });

    setSubmitting(false);
    if (insertError) {
      setError(t("submitError"));
      return;
    }
    toast.success(t("submitSuccess"));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("nameLabel")}
        <input
          type="text"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("countryLabel")}
        <select
          value={countryId}
          onChange={(e) => setCountryId(e.target.value)}
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <option value="">{tCommon("selectPlaceholder")}</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("estimatedStudentsLabel")}
        <input
          type="number"
          min={1}
          value={estimatedStudents}
          onChange={(e) => setEstimatedStudents(e.target.value)}
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("subdomainLabel")}
        <input
          type="text"
          value={subdomain}
          onChange={(e) => setSubdomain(e.target.value)}
          placeholder="lycee-x"
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
        />
        <span className="text-[10px] text-neutral-400">{t("subdomainHint")}</span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={submitting || !schoolName.trim() || !subdomain.trim()}
        className="min-h-11 rounded-xl bg-accent-blue px-4 font-medium text-white disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </div>
  );
}
