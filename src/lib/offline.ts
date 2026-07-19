"use client";

import { openDB, type DBSchema } from "idb";

// Annexe A.7 : deux briques distinctes, écrites ensemble à chaque téléchargement — le fichier brut
// dans le Cache API (lu par le service worker, public/sw.js), les métadonnées structurées ici dans
// IndexedDB (pour afficher /telechargements sans jamais avoir besoin d'énumérer le Cache API).

const DOCUMENTS_CACHE = "le-shabba-documents";
const DB_NAME = "le-shabba-offline";
const DB_VERSION = 1;

export type OfflineDocument = {
  id: string;
  title: string;
  subject: string;
  fileUrl: string;
  downloadedAt: string;
};

export type QueuedAnswer = {
  queueId?: number;
  topicId: string;
  parentId: string | null;
  citedAnswerId: string | null;
  type: "proposal" | "comment";
  content: string;
  attachment: File | null;
  attempts: number;
  createdAt: string;
};

interface OfflineDB extends DBSchema {
  documents: {
    key: string;
    value: OfflineDocument;
  };
  syncQueue: {
    key: number;
    value: QueuedAnswer;
  };
}

function getDB() {
  return openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("documents")) {
        db.createObjectStore("documents", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", { keyPath: "queueId", autoIncrement: true });
      }
    },
  });
}

export async function downloadDocumentForOffline(doc: {
  id: string;
  title: string;
  subject: string;
  fileUrl: string;
}) {
  const cache = await caches.open(DOCUMENTS_CACHE);
  const response = await fetch(doc.fileUrl);
  if (!response.ok) throw new Error("download failed");
  await cache.put(doc.fileUrl, response.clone());

  const db = await getDB();
  await db.put("documents", {
    id: doc.id,
    title: doc.title,
    subject: doc.subject,
    fileUrl: doc.fileUrl,
    downloadedAt: new Date().toISOString(),
  });
}

export async function isDocumentOffline(id: string) {
  const db = await getDB();
  return Boolean(await db.get("documents", id));
}

export async function listOfflineDocuments(): Promise<OfflineDocument[]> {
  const db = await getDB();
  const all = await db.getAll("documents");
  return all.sort((a, b) => +new Date(b.downloadedAt) - +new Date(a.downloadedAt));
}

export async function removeOfflineDocument(id: string) {
  const db = await getDB();
  const doc = await db.get("documents", id);
  if (doc) {
    const cache = await caches.open(DOCUMENTS_CACHE);
    await cache.delete(doc.fileUrl);
  }
  await db.delete("documents", id);
}

// File de synchronisation différée (Annexe A.7) : une réponse au forum rédigée hors-ligne est
// stockée ici, rejouée au retour du réseau, 3 tentatives max par élément.
const MAX_SYNC_ATTEMPTS = 3;

export async function queueOfflineAnswer(answer: Omit<QueuedAnswer, "attempts" | "createdAt" | "queueId">) {
  const db = await getDB();
  await db.add("syncQueue", { ...answer, attempts: 0, createdAt: new Date().toISOString() });
}

export async function getQueuedAnswers() {
  const db = await getDB();
  return db.getAll("syncQueue");
}

export async function flushSyncQueue(
  submit: (answer: QueuedAnswer) => Promise<boolean>,
  onGiveUp?: (answer: QueuedAnswer) => void
) {
  const db = await getDB();
  const queued = await db.getAll("syncQueue");

  for (const answer of queued.sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)
  )) {
    const success = await submit(answer);
    if (success) {
      await db.delete("syncQueue", answer.queueId!);
      continue;
    }
    const attempts = answer.attempts + 1;
    if (attempts >= MAX_SYNC_ATTEMPTS) {
      await db.delete("syncQueue", answer.queueId!);
      onGiveUp?.(answer);
    } else {
      await db.put("syncQueue", { ...answer, attempts });
    }
  }
}
