import { getTranslations } from "next-intl/server";
import { DocumentLibrary } from "@/src/components/library/document-library";
import { ContentWithSidebar } from "@/src/components/layout/content-with-sidebar";

export default async function EpreuvesPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; subject?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("nav");

  return (
    <ContentWithSidebar>
      <DocumentLibrary
        documentType="Épreuve"
        basePath="/epreuves"
        title={t("exams")}
        searchParams={params}
      />
    </ContentWithSidebar>
  );
}
