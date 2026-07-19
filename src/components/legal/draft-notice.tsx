import { Link } from "@/src/i18n/navigation";

export function DraftNotice({ isFr }: { isFr: boolean }) {
  return (
    <p className="text-xs text-neutral-400">
      {isFr ? (
        <>
          Ce texte reflète le fonctionnement actuel de la plateforme et sera ajusté si nécessaire à
          mesure que sa structure évolue. Une question, une demande relative à tes données ou à ce
          texte&nbsp;? <Link className="text-accent-blue" href="/contact">Contacte-nous</Link>.
        </>
      ) : (
        <>
          This text reflects how the platform currently operates and will be adjusted if needed as its
          structure evolves. A question, or a request about your data or this text?{" "}
          <Link className="text-accent-blue" href="/contact">Contact us</Link>.
        </>
      )}
    </p>
  );
}
