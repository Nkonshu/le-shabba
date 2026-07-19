import "server-only";
import { Meilisearch } from "meilisearch";

// §1/§3 : toute recherche (documents, forum) passe par Meilisearch, jamais un filtre en mémoire
// côté client. MEILISEARCH_API_KEY est server-only (§7) — la recherche elle-même est donc toujours
// exécutée côté serveur (Server Component / route handler), jamais directement depuis le navigateur.

let client: Meilisearch | null = null;

function getClient() {
  if (!client) {
    client = new Meilisearch({
      host: process.env.NEXT_PUBLIC_MEILISEARCH_HOST!,
      apiKey: process.env.MEILISEARCH_API_KEY,
    });
  }
  return client;
}

export const DOCUMENTS_INDEX = "documents";
export const TOPICS_INDEX = "forum_topics";

export type IndexedDocument = {
  id: string;
  title: string;
  type: string;
  subject: string;
  level_id: string | null;
  year: string | null;
  status: string;
};

export type IndexedTopic = {
  id: string;
  title: string;
  content: string;
  subject: string;
  level_id: string | null;
  tags: string[];
  is_flagged: boolean;
};

export async function ensureIndexesConfigured() {
  const meili = getClient();

  await meili.index(DOCUMENTS_INDEX).updateSettings({
    searchableAttributes: ["title", "subject"],
    filterableAttributes: ["type", "subject", "level_id", "year", "status"],
  });
  await meili.index(TOPICS_INDEX).updateSettings({
    searchableAttributes: ["title", "content", "tags"],
    filterableAttributes: ["subject", "level_id", "tags", "is_flagged"],
  });
}

export async function indexDocument(doc: IndexedDocument) {
  await getClient().index(DOCUMENTS_INDEX).addDocuments([doc], { primaryKey: "id" });
}

export async function removeDocumentFromIndex(id: string) {
  await getClient().index(DOCUMENTS_INDEX).deleteDocument(id);
}

export async function indexTopic(topic: IndexedTopic) {
  await getClient().index(TOPICS_INDEX).addDocuments([topic], { primaryKey: "id" });
}

export async function removeTopicFromIndex(id: string) {
  await getClient().index(TOPICS_INDEX).deleteDocument(id);
}

export async function searchDocuments(query: string, limit = 10) {
  const result = await getClient()
    .index(DOCUMENTS_INDEX)
    .search(query, { limit, filter: 'status != "removed"' });
  return result.hits as IndexedDocument[];
}

export async function searchTopics(query: string, limit = 10) {
  const result = await getClient()
    .index(TOPICS_INDEX)
    .search(query, { limit, filter: "is_flagged = false" });
  return result.hits as IndexedTopic[];
}
