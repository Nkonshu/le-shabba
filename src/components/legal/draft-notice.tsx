export function DraftNotice({ isFr }: { isFr: boolean }) {
  return (
    <p className="rounded-xl bg-yellow-50 p-3 text-xs text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
      {isFr
        ? "Modèle de départ, à compléter (identité de l'éditeur, coordonnées) et à faire relire par un professionnel du droit avant toute mise en ligne réelle — en particulier parce qu'une partie du public est mineure."
        : "Starting template — fill in the publisher's real identity/contact details and have it reviewed by a legal professional before real-world launch, especially given part of the audience is a minor."}
    </p>
  );
}
