export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isFr = locale === "fr";

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-black">{isFr ? "À propos de Le Shabba" : "About Le Shabba"}</h1>

      {isFr ? (
        <div className="reading-measure flex flex-col gap-4 text-sm text-neutral-600 dark:text-neutral-300">
          <p>
            Le Shabba est une plateforme pensée pour les élèves d&apos;Afrique francophone : une
            bibliothèque de cours, épreuves et fiches de révision partagée par la communauté, et un
            forum où poser ses questions et obtenir de l&apos;aide.
          </p>
          <p>
            L&apos;objectif est simple : rendre accessible du contenu scolaire de qualité, vérifié par
            la communauté et par l&apos;équipe, à des élèves qui n&apos;ont pas toujours un accès facile
            ou stable à internet — d&apos;où l&apos;attention portée dès le départ au fonctionnement
            hors-ligne et à la légèreté de l&apos;application.
          </p>
          <p>
            Le Shabba est une plateforme indépendante, hébergée en France, construite et opérée en
            dehors des grandes plateformes existantes.
          </p>
        </div>
      ) : (
        <div className="reading-measure flex flex-col gap-4 text-sm text-neutral-600 dark:text-neutral-300">
          <p>
            Le Shabba is a platform built for students in French-speaking Africa: a library of
            courses, past exams and revision sheets shared by the community, and a forum to ask
            questions and get help.
          </p>
          <p>
            The goal is simple: make quality school content — verified by the community and by the
            team — accessible to students who don&apos;t always have easy or stable access to the
            internet, which is why offline support and a lightweight app were a priority from day
            one.
          </p>
          <p>Le Shabba is an independent platform, hosted in France, built and operated outside of the major existing platforms.</p>
        </div>
      )}
    </main>
  );
}
