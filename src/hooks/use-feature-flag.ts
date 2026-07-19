"use client";

import { useEffect, useId, useState } from "react";
import { createClient } from "@/src/utils/supabase/client";

/**
 * §5 : un flag doit se répercuter côté client en quelques secondes sans rechargement — abonnement
 * Realtime sur la ligne exacte plutôt qu'un polling, la table `feature_flags` est ajoutée à la
 * publication `supabase_realtime` en migration 0012.
 */
export function useFeatureFlag(key: string, initialValue = false) {
  const [enabled, setEnabled] = useState(initialValue);
  // Nom de canal unique par instance : deux composants qui vérifient le même flag en même temps
  // (ex. le bouton Partager sur chaque réponse d'un sujet) ne doivent jamais partager un canal — le
  // realtime-js client réutilise un canal déjà nommé, et un second appel à `.on()` sur un canal déjà
  // `subscribe()` plante avec "cannot add postgres_changes callbacks... after subscribe()".
  const instanceId = useId();

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", key)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setEnabled(data.enabled);
      });

    const channel = supabase
      .channel(`feature_flags:${key}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "feature_flags", filter: `key=eq.${key}` },
        (payload) => setEnabled(Boolean((payload.new as { enabled: boolean }).enabled))
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [key, instanceId]);

  return enabled;
}
