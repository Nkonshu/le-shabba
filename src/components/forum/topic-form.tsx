"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";

const MAX_TAGS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const TOTAL_STEPS = 3;

type Level = { id: string; label: string; sort_order: number };
type SimilarTopic = { id: string; title: string };

export function TopicForm({
  authorId,
  levels,
  existingTags,
  schoolId,
  redirectBasePath = "/forum",
}: {
  authorId: string;
  levels: Level[];
  existingTags: string[];
  schoolId?: string;
  redirectBasePath?: string;
}) {
  const t = useTranslations("forum");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(1);
  const [levelId, setLevelId] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [similarTopics, setSimilarTopics] = useState<SimilarTopic[]>([]);

  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchSimilarTopics(query: string) {
    setTitle(query);
    if (query.trim().length < 4) {
      setSimilarTopics([]);
      return;
    }
    const { data } = await supabase
      .from("forum_topics")
      .select("id, title")
      .ilike("title", `%${query}%`)
      .limit(3);
    setSimilarTopics(data ?? []);
  }

  function handleTagInputChange(value: string) {
    setTagInput(value);
    if (value.trim().length === 0) {
      setTagSuggestions([]);
      return;
    }
    setTagSuggestions(
      existingTags.filter((tag) => tag.toLowerCase().includes(value.toLowerCase()) && !tags.includes(tag)).slice(0, 5)
    );
  }

  function addTag(tag: string) {
    const clean = tag.trim();
    if (!clean || tags.includes(clean) || tags.length >= MAX_TAGS) return;
    setTags((prev) => [...prev, clean]);
    setTagInput("");
    setTagSuggestions([]);
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t2) => t2 !== tag));
  }

  function handleFileChange(selected: File | null) {
    setFile(null);
    setFileError(null);
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) {
      setFileError(t("fileTooLarge"));
      return;
    }
    setFile(selected);
  }

  async function publish() {
    setSubmitting(true);
    setError(null);

    let attachmentUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${authorId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("forum-attachments").upload(path, file);
      if (uploadError) {
        setError(t("publishError"));
        setSubmitting(false);
        return;
      }
      attachmentUrl = supabase.storage.from("forum-attachments").getPublicUrl(path).data.publicUrl;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("forum_topics")
      .insert({
        author_id: authorId,
        title,
        content,
        level_id: levelId,
        subject,
        tags,
        attachment_url: attachmentUrl,
        school_id: schoolId ?? null,
      })
      .select("id")
      .single();

    setSubmitting(false);
    if (insertError || !inserted) {
      setError(t("publishError"));
      return;
    }

    // Contenu d'école jamais indexé publiquement (privé par défaut, §4.9) — l'index Meilisearch
    // n'a pas encore de tenant token scopé par école (à construire), donc mieux vaut ne pas indexer
    // du tout que de risquer d'exposer du contenu privé à une recherche publique.
    if (!schoolId) {
      fetch("/api/search/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "topic", id: inserted.id }),
      });
    }

    router.push(`${redirectBasePath}/${inserted.id}`);
  }

  const canGoNext =
    (step === 1 && levelId.length > 0 && subject.trim().length > 0 && title.trim().length > 0) ||
    (step === 2 && content.trim().length > 0);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
        {tCommon("next")} {step}/{TOTAL_STEPS}
      </p>
      <h1 className="text-2xl font-black">{t("askQuestion")}</h1>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t("levelLabel")}
            <select
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
              className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
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
            {t("subjectLabel")}
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t("titleLabel")}
            <input
              type="text"
              value={title}
              onChange={(e) => searchSimilarTopics(e.target.value)}
              className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
            />
          </label>
          {similarTopics.length > 0 && (
            <div className="flex flex-col gap-1 rounded-xl bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
              <p className="text-xs text-neutral-400">{t("similarTopics")}</p>
              {similarTopics.map((s) => (
                <a key={s.id} href={`/forum/${s.id}`} target="_blank" rel="noreferrer" className="text-accent-blue">
                  {s.title}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t("descriptionLabel")}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900"
            />
          </label>

          <div className="flex flex-col gap-1.5 text-sm font-medium">
            {t("tagsLabel")}
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded-full bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-900"
                >
                  #{tag} ×
                </button>
              ))}
            </div>
            {tags.length < MAX_TAGS && (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                placeholder={t("tagsPlaceholder")}
                className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
              />
            )}
            {tagSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tagSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addTag(s)}
                    className="rounded-full border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-800"
                  >
                    #{s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t("attachmentLabel")}
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </label>
          {fileError && <p className="text-sm text-red-600 dark:text-red-400">{fileError}</p>}
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
            onClick={publish}
            disabled={submitting || !!fileError}
            className="min-h-11 flex-1 rounded-xl bg-accent-blue px-4 font-medium text-white disabled:opacity-50"
          >
            {t("publish")}
          </button>
        )}
      </div>
    </div>
  );
}
