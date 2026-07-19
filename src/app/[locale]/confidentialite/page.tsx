import { DraftNotice } from "@/src/components/legal/draft-notice";
import { Link } from "@/src/i18n/navigation";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isFr = locale === "fr";

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-black">{isFr ? "Politique de confidentialité" : "Privacy policy"}</h1>

      {isFr ? (
        <div className="reading-measure flex flex-col gap-4 text-sm text-neutral-600 dark:text-neutral-300">
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Données collectées</h2>
            <p>
              Numéro de téléphone (identifiant de connexion) ou compte Google si tu choisis cette
              méthode, pseudo, avatar et bio optionnels, pays et niveau scolaire, contenu que tu publies
              (cours, épreuves, questions, réponses), et des données d&apos;usage techniques (pages
              consultées, appareil, pour le bon fonctionnement du site).
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Mineurs</h2>
            <p>
              Une partie du public de Le Shabba est mineure, notamment dans le cadre des espaces
              école. Le pseudo (distinct du nom réel) est encouragé plutôt que le nom légal,
              précisément pour protéger l&apos;identité des plus jeunes utilisateurs, et nous ne
              collectons jamais plus de données auprès d&apos;un mineur qu&apos;auprès d&apos;un
              adulte (pas de géolocalisation précise, aucun profilage publicitaire). Nous recommandons
              qu&apos;un élève mineur utilise le service avec l&apos;accord d&apos;un parent, d&apos;un
              tuteur légal, ou dans le cadre encadré d&apos;un établissement scolaire inscrit sur la
              plateforme. Un parent ou tuteur légal peut à tout moment nous contacter (voir{" "}
              <Link className="text-accent-blue" href="/contact">Contact</Link>) pour consulter,
              faire rectifier ou supprimer les données d&apos;un mineur dont il a la responsabilité.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Hébergement et sous-traitants</h2>
            <p>
              Toutes les données sont hébergées en France (OVHcloud, Gravelines) via une instance
              Supabase auto-hébergée (base de données, authentification, stockage de fichiers) et
              Meilisearch auto-hébergé pour la recherche — aucune donnée n&apos;est envoyée à un service
              tiers hors de cette infrastructure, à l&apos;exception de Google si tu choisis de te
              connecter avec ce compte (Google agit alors comme fournisseur d&apos;identité).
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Tes droits</h2>
            <p>
              Conformément au RGPD, tu peux demander l&apos;accès, la rectification ou la suppression
              de tes données en nous contactant (voir <Link className="text-accent-blue" href="/contact">Contact</Link>). La
              suppression de ton compte anonymise ton profil ; le contenu déjà publié n&apos;est pas
              supprimé automatiquement pour ne pas casser les discussions où d&apos;autres ont répondu.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Cookies et stockage local</h2>
            <p>
              Un cookie technique mémorise ta langue et ta session de connexion — rien à des fins
              publicitaires. L&apos;application peut également stocker localement (IndexedDB) des
              documents que tu télécharges pour une consultation hors-ligne.
            </p>
          </section>
          <DraftNotice isFr={isFr} />
        </div>
      ) : (
        <div className="reading-measure flex flex-col gap-4 text-sm text-neutral-600 dark:text-neutral-300">
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Data we collect</h2>
            <p>
              Phone number (login identifier) or Google account if you choose that method, optional
              username/avatar/bio, country and school level, content you publish (courses, exams,
              questions, answers), and technical usage data (pages visited, device) needed for the site
              to work.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Minors</h2>
            <p>
              Part of Le Shabba&apos;s audience is a minor, notably within school spaces. A username
              distinct from your real name is encouraged rather than your legal name, specifically to
              protect younger users&apos; identity, and we never collect more data from a minor than
              from an adult (no precise geolocation, no advertising profiling). We recommend that a
              minor student use the service with the agreement of a parent, legal guardian, or within
              the supervised context of a school registered on the platform. A parent or legal guardian
              can contact us at any time (see{" "}
              <Link className="text-accent-blue" href="/contact">Contact</Link>) to review, correct, or
              delete the data of a minor in their care.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Hosting and subprocessors</h2>
            <p>
              All data is hosted in France (OVHcloud, Gravelines) via a self-hosted Supabase instance
              (database, authentication, file storage) and self-hosted Meilisearch for search — no data
              is sent to a third-party service outside this infrastructure, except Google if you choose
              to sign in with that account (Google then acts as an identity provider).
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Your rights</h2>
            <p>
              Under GDPR, you can request access to, correction of, or deletion of your data by
              contacting us (see <Link className="text-accent-blue" href="/contact">Contact</Link>). Deleting your account
              anonymizes your profile; already-published content isn&apos;t automatically removed so
              discussions others replied to aren&apos;t broken.
            </p>
          </section>
          <section>
            <h2 className="font-medium text-neutral-900 dark:text-neutral-50">Cookies and local storage</h2>
            <p>
              A technical cookie remembers your language and login session — never for advertising. The
              app may also store documents you download locally (IndexedDB) for offline reading.
            </p>
          </section>
          <DraftNotice isFr={isFr} />
        </div>
      )}
    </main>
  );
}
