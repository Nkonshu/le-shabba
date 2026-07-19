import { getTranslations } from "next-intl/server";
import { DocumentLibrary } from "@/src/components/library/document-library";
import { ContentWithSidebar } from "@/src/components/layout/content-with-sidebar";

export default async function CoursPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; subject?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("nav");

  return (
    <ContentWithSidebar>
      <DocumentLibrary
        documentType="Cours"
        basePath="/cours"
        title={t("courses")}
        searchParams={params}
      />
    </ContentWithSidebar>
  );
}
