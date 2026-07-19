"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import {
  X,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  ArrowsClockwise,
  CircleHalf,
  DownloadSimple,
  CheckCircle,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/src/utils/supabase/client";
import { downloadDocumentForOffline, isDocumentOffline } from "@/src/lib/offline";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const PROGRESS_DEBOUNCE_MS = 1000;
const RESUME_BANNER_MS = 4000;

function getExtension(url: string) {
  const clean = url.split("?")[0];
  return clean.split(".").pop()?.toLowerCase() ?? "";
}

export function DocumentReader({
  documentId,
  title,
  subject,
  fileUrl,
  initialPage,
  onClose,
}: {
  // null pour un fichier qui n'est pas une ligne de la table `documents` (pièce jointe de sujet,
  // réponse ou commentaire) — dans ce cas on saute tout ce qui suppose une vraie ligne
  // `documents` (vues, reprise de lecture liée par clé étrangère), le lecteur reste utilisable.
  documentId: string | null;
  title: string;
  subject: string;
  fileUrl: string;
  initialPage: number;
  onClose: () => void;
}) {
  const t = useTranslations("reader");
  const supabase = useMemo(() => createClient(), []);
  const isImage = IMAGE_EXTENSIONS.includes(getExtension(fileUrl));
  const cacheId = documentId ?? fileUrl;

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [highContrast, setHighContrast] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(initialPage > 1);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<HTMLDivElement[]>([]);
  const hasScrolledToInitial = useRef(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [offlineAvailable, setOfflineAvailable] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Incrémente views_count une seule fois à l'ouverture (Annexe A.14 / §4.3) — seulement pour un
  // vrai document, jamais pour une pièce jointe (pas de ligne `documents` à mettre à jour).
  useEffect(() => {
    if (documentId) supabase.rpc("increment_document_views", { doc_id: documentId });
    isDocumentOffline(cacheId).then(setOfflineAvailable);
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, cacheId]);

  async function handleDownloadOffline() {
    setDownloading(true);
    try {
      await downloadDocumentForOffline({ id: cacheId, title, subject, fileUrl });
      setOfflineAvailable(true);
      if (documentId) supabase.rpc("increment_document_downloads", { doc_id: documentId });
      toast.success(t("downloadedForOffline"));
    } catch {
      toast.error(t("downloadError"));
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    if (!showResumeBanner) return;
    const id = setTimeout(() => setShowResumeBanner(false), RESUME_BANNER_MS);
    return () => clearTimeout(id);
  }, [showResumeBanner]);

  // Reprise de lecture : upsert débouncé (~1s) à chaque changement de page réel, jamais à chaque
  // défilement brut, pour ne pas saturer une connexion lente (Annexe A.14).
  useEffect(() => {
    if (isImage || !userId || !documentId) return;
    const id = setTimeout(() => {
      supabase.from("document_reading_progress").upsert(
        {
          document_id: documentId,
          user_id: userId,
          last_page: currentPage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,document_id" }
      );
    }, PROGRESS_DEBOUNCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, isImage, userId, documentId]);

  useEffect(() => {
    if (isImage) return;
    let cancelled = false;
    let pdf: PDFDocumentProxy | null = null;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    async function renderPdf() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        loadingTask = pdfjs.getDocument({ url: fileUrl });
        pdf = await loadingTask.promise;
        if (cancelled || !pdf) return;
        setNumPages(pdf.numPages);

        const containerWidth = containerRef.current?.clientWidth ?? 800;

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const unscaled = page.getViewport({ scale: 1 });
          const scale = (containerWidth / unscaled.width) * (window.devicePixelRatio || 1);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.className = "block";

          const holder = pageRefs.current[i - 1];
          if (holder) {
            holder.innerHTML = "";
            holder.appendChild(canvas);
          }

          const context = canvas.getContext("2d");
          if (context) {
            await page.render({ canvas, canvasContext: context, viewport }).promise;
          }
        }

        if (!cancelled && initialPage > 1 && !hasScrolledToInitial.current) {
          hasScrolledToInitial.current = true;
          pageRefs.current[initialPage - 1]?.scrollIntoView({ block: "start" });
        }
      } catch {
        if (!cancelled) setError(t("loadError"));
      }
    }

    renderPdf();
    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, isImage]);

  useEffect(() => {
    if (isImage || !numPages) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const index = pageRefs.current.indexOf(visible.target as HTMLDivElement);
          if (index >= 0) setCurrentPage(index + 1);
        }
      },
      { threshold: [0.5] }
    );
    pageRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [isImage, numPages]);

  return (
    <div className="fixed inset-0 z-50 flex bg-black/95 md:items-center md:justify-center md:bg-black/70">
      <div className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-neutral-950 md:h-[85vh] md:max-w-3xl md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2 dark:border-neutral-900">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
              aria-label={t("zoomIn")}
            >
              <MagnifyingGlassPlus size={18} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
              aria-label={t("zoomOut")}
            >
              <MagnifyingGlassMinus size={18} />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
              aria-label={t("rotate")}
            >
              <ArrowsClockwise size={18} />
            </button>
            {isImage && (
              <button
                onClick={() => setHighContrast((c) => !c)}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:text-neutral-900 dark:hover:text-neutral-50 ${highContrast ? "text-accent-blue" : "text-neutral-500"}`}
                aria-label={t("contrast")}
              >
                <CircleHalf size={18} />
              </button>
            )}
            <button
              onClick={handleDownloadOffline}
              disabled={offlineAvailable || downloading}
              title={offlineAvailable ? t("offlineAvailable") : t("downloadOffline")}
              className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:text-neutral-900 disabled:opacity-70 dark:hover:text-neutral-50 ${offlineAvailable ? "text-green-600 dark:text-green-400" : "text-neutral-500"}`}
              aria-label={offlineAvailable ? t("offlineAvailable") : t("downloadOffline")}
            >
              {offlineAvailable ? <CheckCircle size={18} weight="fill" /> : <DownloadSimple size={18} />}
            </button>
          </div>
          {!isImage && numPages && (
            <span className="text-sm text-neutral-500">
              {currentPage}/{numPages}
            </span>
          )}
          <button
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
            aria-label={t("close")}
          >
            <X size={20} />
          </button>
        </div>

        {showResumeBanner && !isImage && (
          <div role="status" className="bg-blue-50 px-3 py-1.5 text-center text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {t("resumedAtPage", { page: initialPage })}
          </div>
        )}

        <div ref={containerRef} className="flex-1 overflow-auto">
          {error && <p className="p-6 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

          {!error && isImage && (
            <div className="flex min-h-full items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt=""
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  filter: highContrast ? "contrast(1.4) brightness(1.1)" : "none",
                }}
                className="max-w-full transition-transform"
              />
            </div>
          )}

          {!error && !isImage && (
            <div
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: "top center" }}
              className="transition-transform"
            >
              {numPages === null && (
                <p className="p-6 text-center text-sm text-neutral-400">{t("loading")}</p>
              )}
              {numPages !== null &&
                Array.from({ length: numPages }, (_, i) => (
                  <div
                    key={i}
                    ref={(el) => {
                      if (el) pageRefs.current[i] = el;
                    }}
                    className="mx-auto mb-2 max-w-full"
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
