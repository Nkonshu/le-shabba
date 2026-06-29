// src/lib/offline.ts

export async function downloadForOffline(url: string, title: string) {
  const cache = await caches.open('shabba-documents');
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erreur réseau");
    
    // On met le fichier physique en cache
    await cache.put(url, response);
    
    // On enregistre l'index dans le localStorage pour la page "Téléchargements"
    const saved = JSON.parse(localStorage.getItem('offline_docs') || '[]');
    if (!saved.find((d: any) => d.url === url)) {
      saved.push({ 
        url, 
        title, 
        savedAt: new Date().toISOString() 
      });
      localStorage.setItem('offline_docs', JSON.stringify(saved));
    }
    return true;
  } catch (error) {
    console.error("Échec du téléchargement hors-ligne:", error);
    return false;
  }
}