"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Sun, Moon } from "@phosphor-icons/react";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return true;
}

export function ThemeToggle() {
  const t = useTranslations("common");
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    listeners.forEach((callback) => callback());
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? t("themeToLight") : t("themeToDark")}
      title={isDark ? t("themeToLight") : t("themeToDark")}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
