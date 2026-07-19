import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "a", "blockquote",
  "code", "pre", "ul", "ol", "li", "h1", "h2", "h3",
];
const ALLOWED_ATTR = ["href", "target", "rel"];

// Rendu du HTML produit par <RichTextEditor> (sujets/propositions uniquement — les commentaires
// restent en texte brut, jamais passés ici). Assainissement obligatoire : `content` vient de la
// base, pas seulement de l'éditeur — un appel direct à l'API pourrait injecter du HTML arbitraire
// si on faisait confiance à la seule UI.
export function SafeHtml({ html, className }: { html: string; className?: string }) {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
  return <div className={`rich-content ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: clean }} />;
}
