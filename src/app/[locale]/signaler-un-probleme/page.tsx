import { getTranslations } from "next-intl/server";
import { BugReportForm } from "@/src/components/bug-report/bug-report-form";

export default async function ReportProblemPage() {
  const t = await getTranslations("bugReport");

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-black">{t("reportProblem")}</h1>
      <BugReportForm />
    </main>
  );
}
