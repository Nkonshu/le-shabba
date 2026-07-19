import { useTranslations } from "next-intl";

const STYLES: Record<string, string> = {
  unverified: "bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-neutral-400",
  community_verified: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  staff_verified: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  flagged: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("library");
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STYLES[status] ?? STYLES.unverified}`}>
      {t(`status.${status}`)}
    </span>
  );
}
