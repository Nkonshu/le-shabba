"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Trash, BookOpen } from "@phosphor-icons/react";
import { listOfflineDocuments, removeOfflineDocument, type OfflineDocument } from "@/src/lib/offline";
import { DocumentReader } from "@/src/components/reader/document-reader";

export function OfflineDownloadsList() {
  const t = useTranslations("pwa");
  const [docs, setDocs] = useState<OfflineDocument[] | null>(null);
  const [reading, setReading] = useState<OfflineDocument | null>(null);

  useEffect(() => {
    listOfflineDocuments().then(setDocs);
  }, []);

  async function handleRemove(id: string) {
    await removeOfflineDocument(id);
    setDocs((prev) => prev?.filter((d) => d.id !== id) ?? null);
  }

  if (docs === null) return null;

  if (docs.length === 0) {
    return (
      <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-900">
        {t("noDownloads")}
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div>
              <p className="font-medium">{doc.title}</p>
              <p className="text-[10px] text-neutral-400">
                {t("downloadedOn", { date: new Date(doc.downloadedAt).toLocaleDateString() })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setReading(doc)}
                aria-label={t("read")}
                title={t("read")}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-accent-blue"
              >
                <BookOpen size={18} />
              </button>
              <button
                onClick={() => handleRemove(doc.id)}
                aria-label={t("removeDownload")}
                title={t("removeDownload")}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-400 hover:text-red-600"
              >
                <Trash size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {reading && (
        <DocumentReader
          documentId={reading.id}
          title={reading.title}
          subject={reading.subject}
          fileUrl={reading.fileUrl}
          initialPage={1}
          onClose={() => setReading(null)}
        />
      )}
    </>
  );
}
