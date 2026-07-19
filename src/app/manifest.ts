import type { MetadataRoute } from "next";

// Annexe A.21 — icônes placeholder (monogramme généré, pas d'assets de marque fournis), à
// remplacer avant un lancement réel.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Le Shabba",
    short_name: "Le Shabba",
    description: "Cours, épreuves et forum pour les élèves d'Afrique francophone.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512x512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
