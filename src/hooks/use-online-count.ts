"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/utils/supabase/client";

/**
 * §5/C.4 : "Nombre d'élèves en ligne" via le canal de présence Supabase Realtime déjà utilisé pour
 * les feature flags — pas de nouvelle infra, juste un channel Presence plutôt que postgres_changes.
 */
export function useOnlineCount() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const supabase = createClient();
    const clientId = Math.random().toString(36).slice(2);
    const channel = supabase.channel("presence:online", {
      config: { presence: { key: clientId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state).length || 1);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
