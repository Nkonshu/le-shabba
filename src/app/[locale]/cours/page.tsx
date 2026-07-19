import { getTranslations } from "next-intl/server";
import { DocumentLibrary } from "@/src/components/library/document-library";

export default async function CoursPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; subject?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("nav");

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <DocumentLibrary
        documentType="Cours"
        basePath="/cours"
        title={t("courses")}
        searchParams={params}
      />
    </main>
  );
}
