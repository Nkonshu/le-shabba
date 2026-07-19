"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Hors-ligne non disponible sur ce navigateur — l'app reste pleinement utilisable en ligne.
      });
    }
  }, []);

  return null;
}
