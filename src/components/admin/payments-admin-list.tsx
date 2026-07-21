"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";
import { SearchBox } from "@/src/components/admin/stats/search-box";

export type AdminPaymentRow = {
  id: string;
  purpose: string;
  method: string;
  amount: number;
  currency: string;
  external_reference: string | null;
  created_at: string;
  user: { full_name: string | null } | null;
};

export function PaymentsAdminList({
  pending,
  revenue,
  pendingSearch,
  pendingPagination,
}: {
  pending: AdminPaymentRow[];
  revenue: { currency: string; total: number }[];
  pendingSearch?: string;
  pendingPagination?: ReactNode;
}) {
  const t = useTranslations("adminPayments");
  const router = useRouter();
  const supabase = createClient();

  async function confirm(id: string) {
    const { error } = await supabase.rpc("confirm_manual_payment", { payment_id: id });
    if (error) {
      toast.error(t("actionError"));
      return;
    }
    toast.success(t("actionSaved"));
    router.refresh();
  }

  async function reject(id: string) {
    const { error } = await supabase.rpc("reject_manual_payment", { payment_id: id, reason_note: null });
    if (error) {
      toast.error(t("actionError"));
      return;
    }
    toast.success(t("actionSaved"));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-black">{t("revenueTitle")}</h2>
        <div className="flex flex-wrap gap-2">
          {revenue.length === 0 ? (
            <p className="text-sm text-neutral-500">0</p>
          ) : (
            revenue.map((r) => (
              <div key={r.currency} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                {r.total.toLocaleString()} {r.currency}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-black">{t("pendingManualTitle")}</h2>
        <SearchBox
          key={pendingSearch ?? ""}
          paramKey="pSearch"
          defaultValue={pendingSearch}
          placeholder={t("pendingSearchPlaceholder")}
        />
        {pending.length === 0 ? (
          <p className="rounded-xl bg-neutral-50 p-4 text-center text-sm text-neutral-500 dark:bg-neutral-900">
            {t("noPendingPayments")}
          </p>
        ) : (
          pending.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <div>
                <p className="font-medium">
                  {p.amount.toLocaleString()} {p.currency} — {p.user?.full_name ?? "?"}
                </p>
                <p className="text-[10px] text-neutral-400">
                  {p.purpose} · réf. {p.external_reference ?? "—"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => confirm(p.id)} className="min-h-11 rounded-xl bg-accent-blue px-3 text-sm font-medium text-white">
                  {t("confirm")}
                </button>
                <button
                  onClick={() => reject(p.id)}
                  className="min-h-11 rounded-xl border border-neutral-200 px-3 text-sm font-medium dark:border-neutral-800"
                >
                  {t("reject")}
                </button>
              </div>
            </div>
          ))
        )}
        {pendingPagination}
      </section>
    </div>
  );
}
