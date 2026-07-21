"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/src/utils/supabase/client";
import type { FeatureFlag } from "@/src/lib/feature-flags";

type AuditEntry = {
  id: string;
  flag_key: string;
  old_value: boolean | null;
  new_value: boolean | null;
  changed_at: string;
  changed_by: { full_name: string | null } | null;
};

export function FeatureFlagsManager({
  flags: initialFlags,
  auditLog,
  auditPagination,
}: {
  flags: FeatureFlag[];
  auditLog: AuditEntry[];
  auditPagination?: ReactNode;
}) {
  const t = useTranslations("admin");
  const supabase = useMemo(() => createClient(), []);
  const [flags, setFlags] = useState(initialFlags);

  async function toggle(key: string, current: boolean) {
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: !current } : f)));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled: !current, updated_by: user?.id, updated_at: new Date().toISOString() })
      .eq("key", key);

    if (error) {
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: current } : f)));
      toast.error(t("toggleError"));
      return;
    }
    toast.success(t("toggleSaved"));
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h1 className="text-2xl font-black">{t("featureFlagsTitle")}</h1>
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-900">
          {flags.map((flag) => (
            <li key={flag.key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{flag.key}</p>
                {flag.description && (
                  <p className="text-sm text-neutral-500">{flag.description}</p>
                )}
              </div>
              <button
                role="switch"
                aria-checked={flag.enabled}
                onClick={() => toggle(flag.key, flag.enabled)}
                className={`min-h-8 min-w-14 rounded-full px-1 transition-colors ${
                  flag.enabled ? "bg-accent-blue" : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              >
                <span
                  className={`block h-6 w-6 rounded-full bg-white transition-transform ${
                    flag.enabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-black">{t("auditTitle")}</h2>
        <ul className="flex flex-col gap-2 text-sm text-neutral-500">
          {auditLog.map((entry) => (
            <li key={entry.id}>
              {t("auditLine", {
                key: entry.flag_key,
                from: entry.old_value ? "ON" : "OFF",
                to: entry.new_value ? "ON" : "OFF",
                actor: entry.changed_by?.full_name ?? t("unknownActor"),
                date: new Date(entry.changed_at).toLocaleString(),
              })}
            </li>
          ))}
          {auditLog.length === 0 && <li>{t("auditEmpty")}</li>}
        </ul>
        {auditPagination}
      </section>
    </div>
  );
}
