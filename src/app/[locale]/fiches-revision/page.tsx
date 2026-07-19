import { getTranslations } from "next-intl/server";
import { DocumentLibrary } from "@/src/components/library/document-library";
import { ContentWithSidebar } from "@/src/components/layout/content-with-sidebar";

export default async function FichesRevisionPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; subject?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("nav");

  return (
    <ContentWithSidebar>
      <DocumentLibrary
        documentType="Fiche de révision"
        basePath="/fiches-revision"
        title={t("revisionSheets")}
        searchParams={params}
      />
    </ContentWithSidebar>
  );
}
