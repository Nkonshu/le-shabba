import { getTranslations } from "next-intl/server";
import { createClient } from "@/src/utils/supabase/server";
import { ContactMessageStatusSelect } from "@/src/components/admin/contact-message-status-select";
import { Pagination, PAGE_SIZE } from "@/src/components/admin/stats/pagination";
import { SearchBox } from "@/src/components/admin/stats/search-box";

type ContactMessage = {
  id: string;
  sender_id: string | null;
  full_name: string;
  contact_email: string;
  subject: string;
  message: string;
  attachment_url: string | null;
  status: string;
  created_at: string;
};

export async function ContactMessagesList({
  status,
  from,
  to,
  userIds,
  search,
  sp,
  page,
}: {
  status?: string;
  from?: string;
  to?: string;
  userIds?: string[];
  search?: string;
  sp: Record<string, string | undefined>;
  page: number;
}) {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  let query = supabase
    .from("contact_messages")
    .select("id, sender_id, full_name, contact_email, subject, message, attachment_url, status, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (status) query = query.eq("status", status);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59`);
  if (userIds) query = query.in("sender_id", userIds);
  if (search) query = query.or(`subject.ilike.%${search}%,message.ilike.%${search}%,full_name.ilike.%${search}%`);

  const { data: messages, count } = await query;

  const rows = (messages ?? []) as unknown as ContactMessage[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const attachmentUrls = new Map<string, string>();
  await Promise.all(
    rows
      .filter((r) => r.attachment_url)
      .map(async (r) => {
        const { data } = await supabase.storage.from("contact-attachments").createSignedUrl(r.attachment_url!, 3600);
        if (data) attachmentUrls.set(r.id, data.signedUrl);
      })
  );

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <SearchBox key={search ?? ""} paramKey="cmSearch" defaultValue={search} placeholder={t("contactMessagesSearchPlaceholder")} />
        <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-900">
          {t("contactMessagesEmpty")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SearchBox key={search ?? ""} paramKey="cmSearch" defaultValue={search} placeholder={t("contactMessagesSearchPlaceholder")} />
      {rows.map((msg) => (
        <div key={msg.id} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <div className="flex items-start justify-between gap-2">
            <p className="flex-1 font-medium">{msg.subject}</p>
            <ContactMessageStatusSelect id={msg.id} status={msg.status} />
          </div>

          <p className="whitespace-pre-wrap text-neutral-600 dark:text-neutral-300">{msg.message}</p>

          {attachmentUrls.has(msg.id) && (
            <a href={attachmentUrls.get(msg.id)} target="_blank" rel="noreferrer" className="w-fit text-xs text-accent-blue hover:underline">
              {t("contactMessagesAttachment")}
            </a>
          )}

          <p className="text-[10px] text-neutral-400">
            {msg.full_name} · {msg.contact_email} · {new Date(msg.created_at).toLocaleString()}
          </p>
        </div>
      ))}
      <Pagination sp={sp} pageParam="cmPage" page={page} totalPages={totalPages} />
    </div>
  );
}
