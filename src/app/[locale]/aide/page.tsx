export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isFr = locale === "fr";

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-black">{isFr ? "Comment ça marche" : "How it works"}</h1>

      <nav className="flex flex-col gap-1 text-sm">
        <a href="#bibliotheque" className="text-accent-blue">
          {isFr ? "La bibliothèque" : "The library"}
        </a>
        <a href="#forum" className="text-accent-blue">
          {isFr ? "Le forum" : "The forum"}
        </a>
        <a href="#ecoles" className="text-accent-blue">
          {isFr ? "Les espaces école" : "School spaces"}
        </a>
        <a href="#horsligne" className="text-accent-blue">
          {isFr ? "Hors-ligne et Premium" : "Offline and Premium"}
        </a>
      </nav>

      {isFr ? (
        <div className="reading-measure flex flex-col gap-8 text-sm text-neutral-600 dark:text-neutral-300">
          <section id="bibliotheque" className="flex flex-col gap-2">
            <h2 className="font-black text-neutral-900 dark:text-neutral-50">La bibliothèque</h2>
            <p>
              Tous les cours, épreuves et fiches de révision publiés portent un badge de statut, pour
              que tu saches d&apos;un coup d&apos;œil à quel point on peut leur faire confiance :
            </p>
            <ul className="flex flex-col gap-1 pl-4">
              <li>
                <strong>Non vérifié</strong> (gris) — vient d&apos;être publié, personne ne l&apos;a
                encore évalué.
              </li>
              <li>
                <strong>Vérifié par la communauté</strong> (bleu) — a reçu suffisamment de votes positifs
                d&apos;autres élèves sans signalement.
              </li>
              <li>
                <strong>Vérifié par l&apos;équipe</strong> (vert) — validé directement par l&apos;équipe
                Le Shabba, généralement pour des annales officielles.
              </li>
            </ul>
            <p>Tu peux voter (👍/👎) sur n&apos;importe quel document — sauf le tien.</p>
          </section>

          <section id="forum" className="flex flex-col gap-2">
            <h2 className="font-black text-neutral-900 dark:text-neutral-50">Le forum</h2>
            <p>Le principe est simple :</p>
            <ol className="flex flex-col gap-1 pl-4">
              <li>1. Tu poses une question (niveau, matière, titre, description).</li>
              <li>2. La communauté propose des réponses (&laquo;&nbsp;propositions&nbsp;&raquo;), et peut aussi commenter chaque proposition.</li>
              <li>
                3. Si l&apos;une des propositions résout ta question, marque-la comme solution — elle
                apparaît alors avec une coche verte, pour que les prochains visiteurs la trouvent tout de
                suite.
              </li>
            </ol>
            <p>
              Tu peux voter sur une proposition comme sur un commentaire, suivre un sujet pour être
              prévenu des nouvelles réponses, et mettre en favori ce que tu veux retrouver plus tard.
            </p>
          </section>

          <section id="ecoles" className="flex flex-col gap-2">
            <h2 className="font-black text-neutral-900 dark:text-neutral-50">Les espaces école</h2>
            <p>
              Un établissement peut demander un espace dédié : un forum privé réservé à ses élèves, géré
              par un ou plusieurs responsables (rôle <strong>admin d&apos;école</strong>) qui peuvent à
              leur tour nommer des <strong>modérateurs</strong> parmi les élèves. Le contenu publié dans
              un espace école reste privé à cet établissement, sauf si un responsable choisit
              explicitement de le partager vers la bibliothèque publique.
            </p>
          </section>

          <section id="horsligne" className="flex flex-col gap-2">
            <h2 className="font-black text-neutral-900 dark:text-neutral-50">Hors-ligne et Premium</h2>
            <p>
              Tu peux télécharger n&apos;importe quel document pour le consulter sans connexion — il
              reste disponible dans <strong>Téléchargements</strong>. Un abonnement Premium (accès
              hors-ligne étendu) est proposé depuis tes <strong>Paramètres</strong>, payable par
              WhatsApp/Orange Money ou PayPal.
            </p>
          </section>
        </div>
      ) : (
        <div className="reading-measure flex flex-col gap-8 text-sm text-neutral-600 dark:text-neutral-300">
          <section id="bibliotheque" className="flex flex-col gap-2">
            <h2 className="font-black text-neutral-900 dark:text-neutral-50">The library</h2>
            <p>
              Every published course, exam, and revision sheet carries a status badge, so you know at a
              glance how much to trust it:
            </p>
            <ul className="flex flex-col gap-1 pl-4">
              <li>
                <strong>Unverified</strong> (gray) — just published, no one has reviewed it yet.
              </li>
              <li>
                <strong>Community verified</strong> (blue) — received enough positive votes from other
                students with no open report.
              </li>
              <li>
                <strong>Staff verified</strong> (green) — validated directly by the Le Shabba team,
                usually for official past exams.
              </li>
            </ul>
            <p>You can vote (👍/👎) on any document — except your own.</p>
          </section>

          <section id="forum" className="flex flex-col gap-2">
            <h2 className="font-black text-neutral-900 dark:text-neutral-50">The forum</h2>
            <p>The idea is simple:</p>
            <ol className="flex flex-col gap-1 pl-4">
              <li>1. You ask a question (level, subject, title, description).</li>
              <li>2. The community proposes answers (&ldquo;proposals&rdquo;), and can also comment on each proposal.</li>
              <li>
                3. If one of the proposals solves your question, mark it as the solution — it then shows
                with a green checkmark, so future visitors find it right away.
              </li>
            </ol>
            <p>
              You can vote on a proposal just like a comment, follow a topic to get notified of new
              answers, and favorite anything you want to find again later.
            </p>
          </section>

          <section id="ecoles" className="flex flex-col gap-2">
            <h2 className="font-black text-neutral-900 dark:text-neutral-50">School spaces</h2>
            <p>
              A school can request a dedicated space: a private forum reserved for its students,
              managed by one or more <strong>school admins</strong>, who can in turn appoint{" "}
              <strong>moderators</strong> among the students. Content published in a school space stays
              private to that school unless an admin explicitly chooses to share it to the public
              library.
            </p>
          </section>

          <section id="horsligne" className="flex flex-col gap-2">
            <h2 className="font-black text-neutral-900 dark:text-neutral-50">Offline and Premium</h2>
            <p>
              You can download any document to read it without a connection — it stays available under{" "}
              <strong>Downloads</strong>. A Premium subscription (extended offline access) is offered
              from your <strong>Settings</strong>, payable via WhatsApp/Orange Money or PayPal.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
