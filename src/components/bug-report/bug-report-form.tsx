"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/src/utils/supabase/client";

export function BugReportForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const t = useTranslations("bugReport");
  const supabase = createClient();

  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(Boolean(data.user)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    if (!description.trim()) return;
    setSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let screenshotPath: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${user?.id ?? "anon"}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("bug-screenshots").upload(path, file);
      if (!uploadError) screenshotPath = path;
    }

    const { error: insertError } = await supabase.from("bug_reports").insert({
      reporter_id: user?.id ?? null,
      contact_email: user ? null : contactEmail || null,
      description,
      page_url: window.location.href,
      device_info: navigator.userAgent,
      screenshot_url: screenshotPath,
    });

    setSubmitting(false);
    if (insertError) {
      setError(t("submitError"));
      return;
    }

    setSubmitted(true);
    onSubmitted?.();
  }

  if (submitted) {
    return <p className="text-sm">{t("thankYou")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("descriptionLabel")}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("screenshotLabel")}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </label>

      {isLoggedIn === false && (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("contactEmailLabel")}
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
          />
        </label>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting || !description.trim()}
        className="min-h-11 rounded-xl bg-accent-blue px-4 font-medium text-white disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </div>
  );
}
