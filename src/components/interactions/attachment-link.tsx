"use client";

import { useState } from "react";
import { FileArrowDown } from "@phosphor-icons/react";
import { DocumentReader } from "@/src/components/reader/document-reader";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
const VIEWABLE_EXTENSIONS = ["pdf", ...IMAGE_EXTENSIONS];

function fileName(url: string) {
  try {
    return decodeURIComponent(url.split("/").pop() ?? url).split("?")[0];
  } catch {
    return url;
  }
}

// Un sujet/proposition/commentaire peut joindre un fichier (attachment_url) — s'il est consultable
// (PDF, image), le clic ouvre notre liseuse (comme pour un document de la bibliothèque) plutôt que
// de déléguer au visualisateur du navigateur ou de déclencher un téléchargement brut. `documentId`
// reste null ici : ce n'est pas une ligne de la table `documents`, DocumentReader saute tout ce qui
// en dépend (vues, reprise de lecture).
export function AttachmentLink({ url, title }: { url: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const name = fileName(url);
  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  if (!VIEWABLE_EXTENSIONS.includes(ext)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-fit min-h-11 items-center gap-2 rounded-xl border border-neutral-200 px-3 text-sm text-accent-blue dark:border-neutral-800"
      >
        <FileArrowDown size={16} />
        <span className="line-clamp-1">{name}</span>
      </a>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-fit min-h-11 items-center gap-2 rounded-xl border border-neutral-200 px-3 text-sm text-accent-blue dark:border-neutral-800"
      >
        <FileArrowDown size={16} />
        <span className="line-clamp-1">{name}</span>
      </button>
      {open && (
        <DocumentReader
          documentId={null}
          title={title ?? name}
          subject=""
          fileUrl={url}
          initialPage={1}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
