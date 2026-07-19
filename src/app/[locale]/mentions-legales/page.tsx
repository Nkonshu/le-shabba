import { DraftNotice } from "@/src/components/legal/draft-notice";
import { Link } from "@/src/i18n/navigation";

export default async function LegalNoticePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isFr = locale === "fr";

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-black">{isFr ? "Mentions légales" : "Legal notice"}</h1>

      {isFr ? (
        <div className="reading-measure flex flex-col gap-4 text-sm text-neutral-600 dark:text-neutral-300">
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Éditeur du site</h2>
            <p>
              Le Shabba est édité à titre indépendant dans le cadre du développement de la plateforme.
              Pour toute demande d&apos;identification légale, notification ou réclamation, le
              responsable de la publication est joignable via la page{" "}
              <Link className="text-accent-blue" href="/contact">Contact</Link>.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Hébergement</h2>
            <p>
              Ce site est hébergé sur un serveur privé virtuel (VPS) OVHcloud, situé à Gravelines,
              France. OVH SAS, 2 rue Kellermann, 59100 Roubaix, France.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Propriété intellectuelle</h2>
            <p>
              La structure et le code de la plateforme Le Shabba sont la propriété de son éditeur. Le
              contenu publié par les utilisateurs (cours, épreuves, discussions) reste la propriété de
              son auteur, qui certifie être autorisé à le partager au moment de la publication.
            </p>
          </section>
          <DraftNotice isFr={isFr} />
        </div>
      ) : (
        <div className="reading-measure flex flex-col gap-4 text-sm text-neutral-600 dark:text-neutral-300">
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Publisher</h2>
            <p>
              Le Shabba is published independently as part of the platform&apos;s development. For any
              legal identification request, notice, or complaint, the person responsible for
              publication can be reached via the{" "}
              <Link className="text-accent-blue" href="/contact">Contact</Link> page.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Hosting</h2>
            <p>
              This site is hosted on an OVHcloud virtual private server (VPS) located in Gravelines,
              France. OVH SAS, 2 rue Kellermann, 59100 Roubaix, France.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Intellectual property</h2>
            <p>
              The Le Shabba platform&apos;s structure and code belong to its publisher. Content
              published by users (courses, exams, discussions) remains the property of its author, who
              certifies they are authorized to share it at the time of publishing.
            </p>
          </section>
          <DraftNotice isFr={isFr} />
        </div>
      )}
    </main>
  );
}
