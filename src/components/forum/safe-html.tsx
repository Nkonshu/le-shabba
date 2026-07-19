import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "a", "blockquote",
  "code", "pre", "ul", "ol", "li", "h1", "h2", "h3",
];
const ALLOWED_ATTRIBUTES = { a: ["href", "target", "rel"] };

// Rendu du HTML produit par <RichTextEditor> (sujets/propositions uniquement — les commentaires
// restent en texte brut, jamais passés ici). Assainissement obligatoire : `content` vient de la
// base, pas seulement de l'éditeur — un appel direct à l'API pourrait injecter du HTML arbitraire
// si on faisait confiance à la seule UI. `sanitize-html` plutôt que dompurify/jsdom : pas de
// dépendance native/ESM-only qui casse le build de production (Node fixé par l'hébergeur).
export function SafeHtml({ html, className }: { html: string; className?: string }) {
  const clean = sanitizeHtml(html, { allowedTags: ALLOWED_TAGS, allowedAttributes: ALLOWED_ATTRIBUTES });
  return <div className={`rich-content ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: clean }} />;
}
