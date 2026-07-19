"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";
import { EXAM_TYPES } from "@/src/lib/exam-types";
import { isRateLimited } from "@/src/lib/rate-limit";

const DOCUMENT_TYPES = ["Cours", "Épreuve", "Corrigé", "Fiche de révision"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const TOTAL_STEPS = 3;

type Level = { id: string; label: string; sort_order: number };
type ExamSearchResult = { id: string; title: string };
type SimilarDocument = { id: string; title: string; type: string };
type RequestSearchResult = { id: string; title: string };

export function PublishForm({
  authorId,
  countryId,
  levels,
  initialType,
}: {
  authorId: string;
  countryId: string | null;
  levels: Level[];
  initialType?: string;
}) {
  const t = useTranslations("publish");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>(
    DOCUMENT_TYPES.includes(initialType as (typeof DOCUMENT_TYPES)[number]) ? initialType! : "Cours"
  );
  const [relatedQuery, setRelatedQuery] = useState("");
  const [relatedResults, setRelatedResults] = useState<ExamSearchResult[]>([]);
  const [relatedDocumentId, setRelatedDocumentId] = useState<string | null>(null);
  const [relatedTitle, setRelatedTitle] = useState("");

  const [levelId, setLevelId] = useState("");
  const [subject, setSubject] = useState("");
  const [requestQuery, setRequestQuery] = useState("");
  const [requestResults, setRequestResults] = useState<RequestSearchResult[]>([]);
  const [fulfillsRequestId, setFulfillsRequestId] = useState<string | null>(null);
  const [establishment, setEstablishment] = useState("");
  const [examType, setExamType] = useState("");
  const [year, setYear] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [rightsCertified, setRightsCertified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similarDocs, setSimilarDocs] = useState<SimilarDocument[] | null>(null);
  const [checkingSimilarity, setCheckingSimilarity] = useState(false);

  async function searchRelatedExam(query: string) {
    setRelatedQuery(query);
    setRelatedDocumentId(null);
    if (query.trim().length < 2) {
      setRelatedResults([]);
      return;
    }
    const { data } = await supabase
      .from("documents")
      .select("id, title")
      .eq("type", "Épreuve")
      .neq("status", "removed")
      .ilike("title", `%${query}%`)
      .limit(5);
    setRelatedResults(data ?? []);
  }

  async function searchOpenRequests(query: string) {
    setRequestQuery(query);
    setFulfillsRequestId(null);
    if (query.trim().length < 2) {
      setRequestResults([]);
      return;
    }
    const { data } = await supabase
      .from("document_requests")
      .select("id, title")
      .eq("status", "open")
      .ilike("title", `%${query}%`)
      .limit(5);
    setRequestResults(data ?? []);
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

  async function checkSimilarityThenPublish() {
    if (!file) return;

    if (await isRateLimited(authorId, "document")) {
      setError(t("rateLimited"));
      return;
    }

    setCheckingSimilarity(true);
    try {
      const res = await fetch("/api/search/similar-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subject }),
      });
      const { hits } = (await res.json()) as { hits: SimilarDocument[] };
      if (hits.length > 0) {
        setSimilarDocs(hits);
        return;
      }
    } catch {
      // recherche de similarité indisponible : on n'empêche jamais la publication pour autant.
    } finally {
      setCheckingSimilarity(false);
    }
    await publish();
  }

  async function publish() {
    if (!file) return;
    setSimilarDocs(null);
    setSubmitting(true);
    setError(null);

    const ext = file.name.split(".").pop();
    const path = `${authorId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
    if (uploadError) {
      setError(t("publishError"));
      setSubmitting(false);
      return;
    }
    const fileUrl = supabase.storage.from("documents").getPublicUrl(path).data.publicUrl;

    const { data: inserted, error: insertError } = await supabase
      .from("documents")
      .insert({
        author_id: authorId,
        title,
        type,
        related_document_id: relatedDocumentId,
        level_id: levelId,
        subject,
        year: type === "Épreuve" ? year || null : null,
        country_id: countryId,
        establishment: type === "Épreuve" ? establishment || null : null,
        exam_type: type === "Épreuve" ? examType || null : null,
        file_url: fileUrl,
        rights_certified: rightsCertified,
      })
      .select("id")
      .single();

    setSubmitting(false);
    if (insertError || !inserted) {
      setError(t("publishError"));
      return;
    }

    fetch("/api/search/index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "document", id: inserted.id }),
    });

    if (fulfillsRequestId) {
      await supabase.rpc("fulfill_document_request", { request_id: fulfillsRequestId, doc_id: inserted.id });
    }

    toast.success(t("publishSuccess"));
    router.push(`/document/${inserted.id}`);
  }

  const canGoNext =
    (step === 1 && title.trim().length > 0 && type && (type !== "Corrigé" || relatedDocumentId)) ||
    (step === 2 && levelId.length > 0 && subject.trim().length > 0);
  const canPublish = file !== null && rightsCertified && !fileError;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
        {t("step", { current: step, total: TOTAL_STEPS })}
      </p>
      <h1 className="text-2xl font-black">{t("title")}</h1>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t("titleLabel")}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
            />
          </label>

          <div className="flex flex-col gap-1.5 text-sm font-medium">
            {t("typeLabel")}
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_TYPES.map((docType) => (
                <button
                  key={docType}
                  type="button"
                  onClick={() => setType(docType)}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-medium ${
                    type === docType
                      ? "border-accent-blue bg-blue-50 dark:bg-blue-950"
                      : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  {t(`type.${docType}`)}
                </button>
              ))}
            </div>
          </div>

          {type === "Corrigé" && (
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              {t("relatedExamLabel")}
              <input
                type="text"
                value={relatedQuery}
                onChange={(e) => searchRelatedExam(e.target.value)}
                placeholder={t("relatedExamPlaceholder")}
                className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
              />
              {relatedTitle && !relatedResults.length && (
                <span className="text-xs text-neutral-500">{relatedTitle}</span>
              )}
              {relatedResults.length > 0 && (
                <ul className="flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-800">
                  {relatedResults.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setRelatedDocumentId(r.id);
                          setRelatedTitle(r.title);
                          setRelatedQuery(r.title);
                          setRelatedResults([]);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        {r.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </label>
          )}
        </div>
      )}

      {step === 2 && (
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
              placeholder={t("subjectPlaceholder")}
              className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t("fulfillsRequestLabel")}
            <input
              type="text"
              value={requestQuery}
              onChange={(e) => searchOpenRequests(e.target.value)}
              placeholder={t("fulfillsRequestPlaceholder")}
              className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
            />
            {fulfillsRequestId && !requestResults.length && (
              <span className="text-xs text-green-600 dark:text-green-400">{t("fulfillsRequestSelected")}</span>
            )}
            {requestResults.length > 0 && (
              <ul className="flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-800">
                {requestResults.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setFulfillsRequestId(r.id);
                        setRequestQuery(r.title);
                        setRequestResults([]);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                      {r.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>

          {type === "Épreuve" && (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {t("establishmentLabel")}
                <input
                  type="text"
                  value={establishment}
                  onChange={(e) => setEstablishment(e.target.value)}
                  className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {t("examTypeLabel")}
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <option value="">{tCommon("selectPlaceholder")}</option>
                  {EXAM_TYPES.map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {t("yearLabel")}
                <input
                  type="text"
                  inputMode="numeric"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2026"
                  className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900"
                />
              </label>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t("fileLabel")}
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </label>
          {fileError && <p className="text-sm text-red-600 dark:text-red-400">{fileError}</p>}

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={rightsCertified}
              onChange={(e) => setRightsCertified(e.target.checked)}
              className="mt-1 h-5 w-5"
            />
            {t("rightsCertifiedLabel")}
          </label>
        </div>
      )}

      {similarDocs && (
        <div className="flex flex-col gap-2 rounded-xl bg-yellow-50 p-3 dark:bg-yellow-950">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{t("similarDocsWarning")}</p>
          <ul className="flex flex-col gap-1 text-sm text-yellow-800 dark:text-yellow-200">
            {similarDocs.map((d) => (
              <li key={d.id}>· {d.title}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              onClick={() => setSimilarDocs(null)}
              className="min-h-11 flex-1 rounded-xl border border-yellow-300 px-3 text-sm font-medium dark:border-yellow-800"
            >
              {t("cancelToVerify")}
            </button>
            <button
              onClick={publish}
              disabled={submitting}
              className="min-h-11 flex-1 rounded-xl bg-accent-blue px-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {t("publishAnyway")}
            </button>
          </div>
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
            onClick={checkSimilarityThenPublish}
            disabled={!canPublish || submitting || checkingSimilarity}
            className="min-h-11 flex-1 rounded-xl bg-accent-blue px-4 font-medium text-white disabled:opacity-50"
          >
            {t("publish")}
          </button>
        )}
      </div>
    </div>
  );
}
