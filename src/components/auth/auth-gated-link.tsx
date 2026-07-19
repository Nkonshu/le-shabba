"use client";

import { Link } from "@/src/i18n/navigation";
import { useAuthGate } from "@/src/components/auth/auth-modal-provider";

// Un lien de création (poser une question, publier, faire une demande...) toujours visible, y
// compris pour un visiteur non connecté — le clic ouvre la modale de connexion au lieu de naviguer,
// et le renvoie automatiquement ici une fois connecté (§ voir AuthModalProvider).
export function AuthGatedLink({
  href,
  userId,
  className,
  children,
}: {
  href: string;
  userId: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const authGate = useAuthGate();

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (!authGate(userId, href)) e.preventDefault();
      }}
    >
      {children}
    </Link>
  );
}
