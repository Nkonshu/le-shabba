import { GraduationCap, BookOpen } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/src/i18n/navigation";

export function SelectionCard({
  href,
  label,
  count,
  icon,
}: {
  href: string;
  label: string;
  count?: number;
  icon: "level" | "subject";
}) {
  const Icon = icon === "level" ? GraduationCap : BookOpen;
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 hover:border-accent-blue dark:border-neutral-800"
    >
      <Icon size={20} className="shrink-0 text-neutral-400" />
      <span className="flex-1 font-medium">{label}</span>
      {typeof count === "number" && (
        <span className="text-[10px] text-neutral-400">{count}</span>
      )}
    </Link>
  );
}
