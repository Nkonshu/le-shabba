"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DocumentReader } from "@/src/components/reader/document-reader";

export function DocumentReaderLauncher({
  documentId,
  title,
  subject,
  fileUrl,
  initialPage,
}: {
  documentId: string;
  title: string;
  subject: string;
  fileUrl: string;
  initialPage: number;
}) {
  const t = useTranslations("reader");
  const [open, setOpen] = useState(true);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="min-h-11 w-fit rounded-xl bg-accent-blue px-4 font-medium text-white"
        >
          {t("read")}
        </button>
      )}
      {open && (
        <DocumentReader
          documentId={documentId}
          title={title}
          subject={subject}
          fileUrl={fileUrl}
          initialPage={initialPage}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
