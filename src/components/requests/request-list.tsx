"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RequestForm } from "@/src/components/requests/request-form";

type Level = { id: string; label: string };
export type RequestRow = {
  id: string;
  title: string;
  subject: string;
  status: string;
  created_at: string;
  fulfilled_by_document_id: string | null;
  level: { label: string } | null;
  country: { code: string } | null;
};

export function RequestList({
  requests,
  userId,
  countryId,
  levels,
}: {
  requests: RequestRow[];
  userId: string | null;
  countryId: string | null;
  levels: Level[];
}) {
  const t = useTranslations("requests");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {userId && (
        <div>
          {showForm ? (
            <RequestForm
              requesterId={userId}
              countryId={countryId}
              levels={levels}
              onCreated={() => setShowForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="min-h-11 w-fit rounded-xl bg-accent-blue px-4 text-sm font-medium text-white"
            >
              {t("newRequest")}
            </button>
          )}
        </div>
      )}

      {requests.length === 0 ? (
        <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-900">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((request) => (
            <div key={request.id} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{request.title}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                    request.status === "fulfilled"
                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-900"
                  }`}
                >
                  {request.status === "fulfilled" ? t("fulfilled") : t("open")}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {request.level && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] dark:bg-neutral-900">
                    {request.level.label}
                  </span>
                )}
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {request.subject}
                </span>
                {request.country && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] dark:bg-neutral-900">
                    {request.country.code}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-neutral-400">{new Date(request.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
