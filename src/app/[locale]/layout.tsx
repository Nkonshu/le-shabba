import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Toaster } from "sonner";
import { routing } from "@/src/i18n/routing";
import { SiteHeader } from "@/src/components/layout/site-header";
import { SiteFooter } from "@/src/components/layout/site-footer";
import { BugReportButton } from "@/src/components/bug-report/bug-report-button";
import { ServiceWorkerRegister } from "@/src/components/pwa/service-worker-register";
import { InstallBanner } from "@/src/components/pwa/install-banner";
import { OfflineIndicator } from "@/src/components/pwa/offline-indicator";
import { SyncQueueManager } from "@/src/components/pwa/sync-queue-manager";
import { getCurrentProfile } from "@/src/lib/dal";
import { isFeatureEnabled } from "@/src/lib/feature-flags";
import "../globals.css";

export const metadata: Metadata = {
  title: "Le Shabba",
  description: "Cours, épreuves et forum pour les élèves d'Afrique francophone.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const [maintenanceMode, bugReportsEnabled] = await Promise.all([
    isFeatureEnabled("platform.maintenance_mode"),
    isFeatureEnabled("support.bug_reports"),
  ]);
  let isStaff = false;
  if (maintenanceMode) {
    const profile = await getCurrentProfile();
    isStaff = profile ? ["admin", "super_admin"].includes(profile.role) : false;
  }

  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider locale={locale}>
          <ServiceWorkerRegister />
          <SyncQueueManager />
          <OfflineIndicator />
          <SiteHeader />
          <div className="flex-1">{maintenanceMode && !isStaff ? <MaintenanceNotice /> : children}</div>
          <SiteFooter />
          {bugReportsEnabled && !(maintenanceMode && !isStaff) && <BugReportButton />}
          {!(maintenanceMode && !isStaff) && <InstallBanner />}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

async function MaintenanceNotice() {
  const t = await getTranslations("common");
  return (
    <main role="status" className="mx-auto flex max-w-sm flex-col gap-2 px-4 py-16 text-center">
      <p className="text-lg font-black">{t("maintenanceTitle")}</p>
      <p className="text-sm text-neutral-500">{t("maintenanceBody")}</p>
    </main>
  );
}
