"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useRouter } from "@/src/i18n/navigation";

// Barre de recherche générique pour une liste admin — écrit dans l'URL comme le reste des filtres
// de /admin (recherche = navigation, gérée côté serveur, fonctionne donc sur toutes les pages d'une
// liste paginée, pas seulement celle affichée à l'écran). Debounce géré via un ref de timeout dans
// le gestionnaire d'événement plutôt qu'un effet, pour ne jamais faire de setState dans un useEffect
// (règle react-hooks/set-state-in-effect du projet). Le parent doit passer `key={defaultValue ?? ""}`
// pour que le champ se resynchronise proprement si le paramètre est effacé ailleurs (ex. bouton
// "Réinitialiser" d'un autre filtre de la même liste).
export function SearchBox({
  paramKey,
  defaultValue,
  placeholder,
}: {
  paramKey: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const t = useTranslations("common");
  const [text, setText] = useState(defaultValue ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setText(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (value) params.set(paramKey, value);
      else params.delete(paramKey);
      router.push(`/admin?${params.toString()}`);
    }, 400);
  }

  return (
    <div className="relative">
      <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
      <input
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder ?? t("search")}
        className="min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 pl-8 text-sm dark:border-neutral-800 dark:bg-neutral-900"
      />
    </div>
  );
}
