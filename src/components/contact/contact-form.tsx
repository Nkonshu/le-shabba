"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/src/utils/supabase/client";

export function ContactForm() {
  const t = useTranslations("contactForm");
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;
      setContactEmail(user.email ?? "");
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      if (profile?.full_name) setFullName(profile.full_name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    if (!fullName.trim() || !contactEmail.trim() || !subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let attachmentPath: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${user?.id ?? "anon"}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("contact-attachments").upload(path, file);
      if (!uploadError) attachmentPath = path;
    }

    const { error: insertError } = await supabase.from("contact_messages").insert({
      sender_id: user?.id ?? null,
      full_name: fullName,
      contact_email: contactEmail,
      subject,
      message,
      attachment_url: attachmentPath,
    });

    setSubmitting(false);
    if (insertError) {
      setError(t("submitError"));
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return <p className="text-sm">{t("thankYou")}</p>;
  }

  const inputClass =
    "min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900";

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("nameLabel")}
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("emailLabel")}
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("subjectLabel")}
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("messageLabel")}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("attachmentLabel")}
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting || !fullName.trim() || !contactEmail.trim() || !subject.trim() || !message.trim()}
        className="min-h-11 rounded-xl bg-accent-blue px-4 font-medium text-white disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </div>
  );
}
