import { DraftNotice } from "@/src/components/legal/draft-notice";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isFr = locale === "fr";

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-black">
        {isFr ? "Conditions générales d'utilisation" : "Terms of use"}
      </h1>

      {isFr ? (
        <div className="reading-measure flex flex-col gap-4 text-sm text-neutral-600 dark:text-neutral-300">
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Objet</h2>
            <p>
              Le Shabba met à disposition une bibliothèque de documents scolaires et un forum
              d&apos;entraide entre élèves d&apos;Afrique francophone. L&apos;utilisation du service
              implique l&apos;acceptation pleine et entière des présentes conditions.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Contenu publié</h2>
            <p>
              Toute publication (document, question, réponse) doit respecter les droits d&apos;auteur
              d&apos;autrui — la case &laquo;&nbsp;je certifie être autorisé à partager ce document&nbsp;&raquo; engage ta
              responsabilité. Un contenu peut être retiré et un compte suspendu ou banni en cas
              d&apos;abus, de contenu illicite ou de comportement contraire à l&apos;esprit
              d&apos;entraide de la plateforme, avec un motif systématiquement communiqué.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Compte et sécurité</h2>
            <p>
              Un numéro de téléphone (ou un compte Google) ne peut être associé qu&apos;à un seul
              compte. Tu es responsable de la confidentialité de tes moyens de connexion.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Mineurs</h2>
            <p>
              Le service s&apos;adresse notamment à un public scolaire, en partie mineur. L&apos;usage
              par un mineur doit se faire avec l&apos;accord d&apos;un parent, d&apos;un tuteur légal,
              ou dans le cadre d&apos;un établissement scolaire inscrit sur la plateforme (un espace
              école), ce dernier étant réputé avoir obtenu les autorisations nécessaires lorsqu&apos;il
              y inscrit ses élèves. Le Shabba n&apos;exige pas de justificatif d&apos;âge à
              l&apos;inscription mais se réserve le droit de suspendre un compte en cas de signalement
              d&apos;un usage non conforme à ces conditions par un mineur non accompagné.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Responsabilité</h2>
            <p>
              Le Shabba est un service en évolution, fourni &laquo;&nbsp;en l&apos;état&nbsp;&raquo;. L&apos;éditeur ne garantit
              pas l&apos;exactitude du contenu publié par la communauté (d&apos;où le système de
              vérification communautaire et par l&apos;équipe).
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Droit applicable</h2>
            <p>Les présentes conditions sont soumises au droit français.</p>
          </section>
          <DraftNotice isFr={isFr} />
        </div>
      ) : (
        <div className="reading-measure flex flex-col gap-4 text-sm text-neutral-600 dark:text-neutral-300">
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Purpose</h2>
            <p>
              Le Shabba provides a library of school documents and a peer-support forum for students in
              French-speaking Africa. Using the service means accepting these terms in full.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Published content</h2>
            <p>
              Any publication (document, question, answer) must respect others&apos; copyright — the
              &ldquo;I certify I&apos;m authorized to share this document&rdquo; checkbox is your responsibility.
              Content may be removed and an account suspended or banned in case of abuse, unlawful
              content, or behavior against the platform&apos;s spirit of mutual help, with a reason
              always communicated.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Account and security</h2>
            <p>
              A phone number (or Google account) can only be linked to a single account. You are
              responsible for keeping your login credentials confidential.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Minors</h2>
            <p>
              The service is aimed in part at a school-age audience, some of whom are minors. Use by a
              minor must happen with the agreement of a parent, legal guardian, or within the context
              of a school registered on the platform (a school space), the latter being deemed to have
              obtained the necessary authorizations when enrolling its students. Le Shabba does not
              require proof of age at sign-up but reserves the right to suspend an account if a report
              shows use by an unaccompanied minor that doesn&apos;t comply with these terms.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Liability</h2>
            <p>
              Le Shabba is an evolving service, provided &ldquo;as is&rdquo;. The publisher does not guarantee the
              accuracy of community-published content (hence the community and staff verification
              system).
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Governing law</h2>
            <p>These terms are governed by French law.</p>
          </section>
          <DraftNotice isFr={isFr} />
        </div>
      )}
    </main>
  );
}
