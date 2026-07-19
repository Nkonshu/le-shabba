import { FileArrowDown } from "@phosphor-icons/react/dist/ssr";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];

function fileName(url: string) {
  try {
    return decodeURIComponent(url.split("/").pop() ?? url).split("?")[0];
  } catch {
    return url;
  }
}

// Un sujet/proposition/commentaire peut joindre un fichier (attachment_url) — image affichée en
// aperçu comme avant, tout autre type (PDF, doc...) rendu en lien de fichier téléchargeable/consultable.
export function AttachmentLink({ url }: { url: string }) {
  const name = fileName(url);
  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  if (IMAGE_EXTENSIONS.includes(ext)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="max-h-40 w-fit rounded-lg object-cover" />;
  }

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
