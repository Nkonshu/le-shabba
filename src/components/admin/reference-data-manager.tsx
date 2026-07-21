"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PencilSimple, Trash, Plus } from "@phosphor-icons/react";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";
import { SearchBox } from "@/src/components/admin/stats/search-box";

export type CountryRow = { id: string; code: string; name: string };
export type LevelRow = { id: string; country_id: string; label: string; sort_order: number };

export function ReferenceDataManager({
  countries,
  levels,
  countriesSearch,
}: {
  countries: CountryRow[];
  levels: LevelRow[];
  countriesSearch?: string;
}) {
  const t = useTranslations("adminReferenceData");
  const tc = useTranslations("common");
  const router = useRouter();
  const supabase = createClient();

  const [selectedCountryId, setSelectedCountryId] = useState(countries[0]?.id ?? "");
  const [newCountryCode, setNewCountryCode] = useState("");
  const [newCountryName, setNewCountryName] = useState("");
  const [newLevelLabel, setNewLevelLabel] = useState("");
  const [editingCountry, setEditingCountry] = useState<CountryRow | null>(null);
  const [editingLevel, setEditingLevel] = useState<LevelRow | null>(null);

  const levelsForCountry = levels
    .filter((l) => l.country_id === selectedCountryId)
    .sort((a, b) => a.sort_order - b.sort_order);

  async function addCountry() {
    if (!newCountryCode.trim() || !newCountryName.trim()) return;
    const { error } = await supabase
      .from("countries")
      .insert({ code: newCountryCode.trim().toUpperCase(), name: newCountryName.trim() });
    if (error) {
      toast.error(t("saveError"));
      return;
    }
    setNewCountryCode("");
    setNewCountryName("");
    toast.success(t("saved"));
    router.refresh();
  }

  async function saveCountryEdit() {
    if (!editingCountry) return;
    const { error } = await supabase
      .from("countries")
      .update({ code: editingCountry.code.toUpperCase(), name: editingCountry.name })
      .eq("id", editingCountry.id);
    if (error) {
      toast.error(t("saveError"));
      return;
    }
    setEditingCountry(null);
    toast.success(t("saved"));
    router.refresh();
  }

  async function deleteCountry(id: string) {
    if (!window.confirm(t("confirmDeleteCountry"))) return;
    const { error } = await supabase.from("countries").delete().eq("id", id);
    if (error) {
      toast.error(t("deleteBlocked"));
      return;
    }
    toast.success(t("saved"));
    router.refresh();
  }

  async function addLevel() {
    if (!newLevelLabel.trim() || !selectedCountryId) return;
    const nextOrder = levelsForCountry.length > 0 ? Math.max(...levelsForCountry.map((l) => l.sort_order)) + 1 : 1;
    const { error } = await supabase
      .from("education_levels")
      .insert({ country_id: selectedCountryId, label: newLevelLabel.trim(), sort_order: nextOrder });
    if (error) {
      toast.error(t("saveError"));
      return;
    }
    setNewLevelLabel("");
    toast.success(t("saved"));
    router.refresh();
  }

  async function saveLevelEdit() {
    if (!editingLevel) return;
    const { error } = await supabase
      .from("education_levels")
      .update({ label: editingLevel.label, sort_order: editingLevel.sort_order })
      .eq("id", editingLevel.id);
    if (error) {
      toast.error(t("saveError"));
      return;
    }
    setEditingLevel(null);
    toast.success(t("saved"));
    router.refresh();
  }

  async function deleteLevel(id: string) {
    if (!window.confirm(t("confirmDeleteLevel"))) return;
    const { error } = await supabase.from("education_levels").delete().eq("id", id);
    if (error) {
      toast.error(t("deleteBlocked"));
      return;
    }
    toast.success(t("saved"));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-black">{t("countriesTitle")}</h2>
        <SearchBox key={countriesSearch ?? ""} paramKey="rSearch" defaultValue={countriesSearch} placeholder={tc("search")} />
        <div className="flex flex-col gap-2">
          {countries.map((c) =>
            editingCountry?.id === c.id ? (
              <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex gap-2">
                  <input
                    value={editingCountry.code}
                    onChange={(e) => setEditingCountry({ ...editingCountry, code: e.target.value })}
                    className="min-h-11 w-20 rounded-xl border border-neutral-200 bg-white px-2 text-sm uppercase dark:border-neutral-800 dark:bg-neutral-900"
                  />
                  <input
                    value={editingCountry.name}
                    onChange={(e) => setEditingCountry({ ...editingCountry, name: e.target.value })}
                    className="min-h-11 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveCountryEdit} className="min-h-9 rounded-xl bg-accent-blue px-3 text-xs font-medium text-white">
                    {tc("save")}
                  </button>
                  <button onClick={() => setEditingCountry(null)} className="min-h-9 rounded-xl border border-neutral-200 px-3 text-xs font-medium dark:border-neutral-800">
                    {tc("cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <button onClick={() => setSelectedCountryId(c.id)} className={`flex-1 text-left text-sm ${selectedCountryId === c.id ? "font-medium text-accent-blue" : ""}`}>
                  <span className="mr-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] dark:bg-neutral-900">{c.code}</span>
                  {c.name}
                </button>
                <button onClick={() => setEditingCountry(c)} aria-label={tc("edit")} title={tc("edit")} className="flex min-h-9 min-w-9 items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50">
                  <PencilSimple size={14} />
                </button>
                <button onClick={() => deleteCountry(c.id)} aria-label={tc("delete")} title={tc("delete")} className="flex min-h-9 min-w-9 items-center justify-center text-neutral-400 hover:text-red-600">
                  <Trash size={14} />
                </button>
              </div>
            )
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={newCountryCode}
            onChange={(e) => setNewCountryCode(e.target.value)}
            placeholder={t("countryCodePlaceholder")}
            className="min-h-11 w-20 rounded-xl border border-neutral-200 bg-white px-2 text-sm uppercase dark:border-neutral-800 dark:bg-neutral-900"
          />
          <input
            value={newCountryName}
            onChange={(e) => setNewCountryName(e.target.value)}
            placeholder={t("countryNamePlaceholder")}
            className="min-h-11 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
          />
          <button onClick={addCountry} aria-label={t("addCountry")} title={t("addCountry")} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-accent-blue text-white">
            <Plus size={16} />
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-black">{t("levelsTitle")}</h2>
        <select
          value={selectedCountryId}
          onChange={(e) => setSelectedCountryId(e.target.value)}
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="flex flex-col gap-2">
          {levelsForCountry.length === 0 && (
            <p className="text-sm text-neutral-400">{t("emptyLevels")}</p>
          )}
          {levelsForCountry.map((l) =>
            editingLevel?.id === l.id ? (
              <div key={l.id} className="flex items-center gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <input
                  value={editingLevel.label}
                  onChange={(e) => setEditingLevel({ ...editingLevel, label: e.target.value })}
                  className="min-h-11 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                />
                <input
                  type="number"
                  value={editingLevel.sort_order}
                  onChange={(e) => setEditingLevel({ ...editingLevel, sort_order: Number(e.target.value) })}
                  className="min-h-11 w-16 rounded-xl border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                />
                <button onClick={saveLevelEdit} className="min-h-9 rounded-xl bg-accent-blue px-3 text-xs font-medium text-white">
                  {tc("save")}
                </button>
                <button onClick={() => setEditingLevel(null)} className="min-h-9 rounded-xl border border-neutral-200 px-3 text-xs font-medium dark:border-neutral-800">
                  {tc("cancel")}
                </button>
              </div>
            ) : (
              <div key={l.id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <span className="text-sm">{l.label}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditingLevel(l)} aria-label={tc("edit")} title={tc("edit")} className="flex min-h-9 min-w-9 items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50">
                    <PencilSimple size={14} />
                  </button>
                  <button onClick={() => deleteLevel(l.id)} aria-label={tc("delete")} title={tc("delete")} className="flex min-h-9 min-w-9 items-center justify-center text-neutral-400 hover:text-red-600">
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={newLevelLabel}
            onChange={(e) => setNewLevelLabel(e.target.value)}
            placeholder={t("levelLabelPlaceholder")}
            className="min-h-11 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
          />
          <button onClick={addLevel} aria-label={t("addLevel")} title={t("addLevel")} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-accent-blue text-white">
            <Plus size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
