"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash, Plus, PencilSimple, CaretDown, CaretUp } from "@phosphor-icons/react";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/utils/supabase/client";

type ClickRow = { id: string; clicked_at: string; user: { full_name: string | null } | null };

export type SponsoredSlotRow = {
  id: string;
  partner_name: string;
  title: string;
  body: string | null;
  link_url: string;
  image_url: string | null;
  placement: "home_feed" | "subject";
  subject: string | null;
  country_codes: string[] | null;
  education_level_ids: string[] | null;
  languages: string[] | null;
  min_genie_points: number | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  impressions_count: number;
  clicks_count: number;
};

type CountryOption = { id: string; code: string; name: string };
type LevelOption = { id: string; label: string; country_code: string };

type SlotForm = {
  partner_name: string;
  title: string;
  body: string;
  link_url: string;
  image_url: string;
  placement: "home_feed" | "subject";
  subject: string;
  country_codes: string[];
  education_level_ids: string[];
  languages: string[];
  min_genie_points: string;
  starts_at: string;
  ends_at: string;
  active: boolean;
};

const EMPTY_FORM: SlotForm = {
  partner_name: "",
  title: "",
  body: "",
  link_url: "",
  image_url: "",
  placement: "home_feed",
  subject: "",
  country_codes: [],
  education_level_ids: [],
  languages: [],
  min_genie_points: "",
  starts_at: "",
  ends_at: "",
  active: true,
};

function slotToForm(slot: SponsoredSlotRow): SlotForm {
  return {
    partner_name: slot.partner_name,
    title: slot.title,
    body: slot.body ?? "",
    link_url: slot.link_url,
    image_url: slot.image_url ?? "",
    placement: slot.placement,
    subject: slot.subject ?? "",
    country_codes: slot.country_codes ?? [],
    education_level_ids: slot.education_level_ids ?? [],
    languages: slot.languages ?? [],
    min_genie_points: slot.min_genie_points?.toString() ?? "",
    starts_at: slot.starts_at ?? "",
    ends_at: slot.ends_at ?? "",
    active: slot.active,
  };
}

function formToPayload(form: SlotForm) {
  return {
    partner_name: form.partner_name.trim(),
    title: form.title.trim(),
    body: form.body.trim() || null,
    link_url: form.link_url.trim(),
    image_url: form.image_url.trim() || null,
    placement: form.placement,
    subject: form.placement === "subject" ? form.subject.trim() || null : null,
    country_codes: form.country_codes.length ? form.country_codes : null,
    education_level_ids: form.education_level_ids.length ? form.education_level_ids : null,
    languages: form.languages.length ? form.languages : null,
    min_genie_points: form.min_genie_points ? Number(form.min_genie_points) : null,
    starts_at: form.starts_at || null,
    ends_at: form.ends_at || null,
    active: form.active,
  };
}

export function SponsoredSlotsManager({
  slots,
  countries,
  levels,
  matchingUserIds,
}: {
  slots: SponsoredSlotRow[];
  countries: CountryOption[];
  levels: LevelOption[];
  matchingUserIds: string[] | null;
}) {
  const t = useTranslations("adminSponsoredSlots");
  const tc = useTranslations("common");
  const router = useRouter();
  const supabase = createClient();

  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState<SlotForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SlotForm>(EMPTY_FORM);
  const [expandedClicksId, setExpandedClicksId] = useState<string | null>(null);
  const [clicksBySlot, setClicksBySlot] = useState<Record<string, ClickRow[]>>({});
  const [loadingClicks, setLoadingClicks] = useState(false);

  // Le filtre croisé partagé (pays/niveau/utilisateur) peut changer entre deux navigations sans que
  // ce composant remonte — la clé de cache inclut donc le filtre actif, pour qu'un changement de
  // filtre déclenche naturellement un nouveau chargement plutôt que de servir un résultat périmé.
  const matchingUserIdsKey = matchingUserIds ? matchingUserIds.join(",") : "all";

  async function toggleClicks(slotId: string) {
    if (expandedClicksId === slotId) {
      setExpandedClicksId(null);
      return;
    }
    setExpandedClicksId(slotId);
    const cacheKey = `${slotId}:${matchingUserIdsKey}`;
    if (clicksBySlot[cacheKey]) return;
    setLoadingClicks(true);
    let query = supabase
      .from("sponsored_slot_clicks")
      .select("id, clicked_at, user:profiles(full_name)")
      .eq("slot_id", slotId)
      .order("clicked_at", { ascending: false })
      .limit(50);
    if (matchingUserIds) query = query.in("user_id", matchingUserIds);
    const { data, error } = await query;
    setLoadingClicks(false);
    if (error) {
      toast.error(t("saveError"));
      return;
    }
    setClicksBySlot((prev) => ({ ...prev, [cacheKey]: (data as unknown as ClickRow[]) ?? [] }));
  }

  async function createSlot() {
    if (!newForm.partner_name.trim() || !newForm.title.trim() || !newForm.link_url.trim()) return;
    const { error } = await supabase.from("sponsored_slots").insert(formToPayload(newForm));
    if (error) {
      toast.error(t("saveError"));
      return;
    }
    setNewForm(EMPTY_FORM);
    setAdding(false);
    toast.success(t("saved"));
    router.refresh();
  }

  async function saveEdit(id: string) {
    const { error } = await supabase.from("sponsored_slots").update(formToPayload(editForm)).eq("id", id);
    if (error) {
      toast.error(t("saveError"));
      return;
    }
    setEditingId(null);
    toast.success(t("saved"));
    router.refresh();
  }

  async function toggleActive(slot: SponsoredSlotRow) {
    const { error } = await supabase.from("sponsored_slots").update({ active: !slot.active }).eq("id", slot.id);
    if (error) {
      toast.error(t("saveError"));
      return;
    }
    router.refresh();
  }

  async function deleteSlot(id: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    const { error } = await supabase.from("sponsored_slots").delete().eq("id", id);
    if (error) {
      toast.error(t("saveError"));
      return;
    }
    toast.success(t("saved"));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {slots.length === 0 && !adding && <p className="text-sm text-neutral-400">{t("empty")}</p>}

      {slots.map((slot) =>
        editingId === slot.id ? (
          <SlotFormFields
            key={slot.id}
            form={editForm}
            setForm={setEditForm}
            countries={countries}
            levels={levels}
            t={t}
            tc={tc}
            onSave={() => saveEdit(slot.id)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={slot.id} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-medium">{slot.title}</span>
                <span className="text-xs text-neutral-400">
                  {slot.partner_name} · {slot.placement === "subject" ? slot.subject : t("placementHomeFeed")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive(slot)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    slot.active ? "bg-accent-blue/10 text-accent-blue" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-900"
                  }`}
                >
                  {t("activeLabel")}
                </button>
                <button
                  onClick={() => {
                    setEditForm(slotToForm(slot));
                    setEditingId(slot.id);
                  }}
                  aria-label={tc("edit")}
                  className="flex min-h-9 min-w-9 items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
                >
                  <PencilSimple size={14} />
                </button>
                <button
                  onClick={() => deleteSlot(slot.id)}
                  aria-label={tc("delete")}
                  className="flex min-h-9 min-w-9 items-center justify-center text-neutral-400 hover:text-red-600"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-neutral-400">
              <span>{t("impressionsCount", { count: slot.impressions_count })}</span>
              <button
                onClick={() => toggleClicks(slot.id)}
                className="flex items-center gap-1 text-accent-blue hover:underline"
              >
                {t("clicksCount", { count: slot.clicks_count })}
                {expandedClicksId === slot.id ? <CaretUp size={10} /> : <CaretDown size={10} />}
              </button>
            </div>

            {expandedClicksId === slot.id && (
              <div className="flex flex-col gap-1 rounded-lg bg-neutral-50 p-2 dark:bg-neutral-950">
                {loadingClicks && !clicksBySlot[`${slot.id}:${matchingUserIdsKey}`] ? (
                  <span className="text-[11px] text-neutral-400">{tc("loading")}</span>
                ) : (clicksBySlot[`${slot.id}:${matchingUserIdsKey}`] ?? []).length === 0 ? (
                  <span className="text-[11px] text-neutral-400">{t("noClicks")}</span>
                ) : (
                  (clicksBySlot[`${slot.id}:${matchingUserIdsKey}`] ?? []).map((click) => (
                    <div key={click.id} className="flex items-center justify-between text-[11px]">
                      <span>{click.user?.full_name ?? t("anonymousClick")}</span>
                      <span className="text-neutral-400">{new Date(click.clicked_at).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      )}

      {adding ? (
        <SlotFormFields
          form={newForm}
          setForm={setNewForm}
          countries={countries}
          levels={levels}
          t={t}
          tc={tc}
          onSave={createSlot}
          onCancel={() => {
            setAdding(false);
            setNewForm(EMPTY_FORM);
          }}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 text-sm font-medium text-neutral-500 hover:border-neutral-400 dark:border-neutral-700"
        >
          <Plus size={16} />
          {t("addSlot")}
        </button>
      )}
    </div>
  );
}

function SlotFormFields({
  form,
  setForm,
  countries,
  levels,
  t,
  tc,
  onSave,
  onCancel,
}: {
  form: SlotForm;
  setForm: (form: SlotForm) => void;
  countries: CountryOption[];
  levels: LevelOption[];
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
  onSave: () => void;
  onCancel: () => void;
}) {
  const inputClass =
    "min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900";

  function toggleInArray(field: "country_codes" | "education_level_ids" | "languages", value: string) {
    const current = form[field];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setForm({ ...form, [field]: next });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <input
        value={form.partner_name}
        onChange={(e) => setForm({ ...form, partner_name: e.target.value })}
        placeholder={t("partnerNamePlaceholder")}
        className={inputClass}
      />
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder={t("titlePlaceholder")}
        className={inputClass}
      />
      <textarea
        value={form.body}
        onChange={(e) => setForm({ ...form, body: e.target.value })}
        placeholder={t("bodyPlaceholder")}
        className={`${inputClass} min-h-20 py-2`}
      />
      <input
        value={form.link_url}
        onChange={(e) => setForm({ ...form, link_url: e.target.value })}
        placeholder={t("linkUrlPlaceholder")}
        className={inputClass}
      />
      <input
        value={form.image_url}
        onChange={(e) => setForm({ ...form, image_url: e.target.value })}
        placeholder={t("imageUrlPlaceholder")}
        className={inputClass}
      />

      <div className="flex gap-2">
        <select
          value={form.placement}
          onChange={(e) => setForm({ ...form, placement: e.target.value as "home_feed" | "subject" })}
          className={inputClass}
        >
          <option value="home_feed">{t("placementHomeFeed")}</option>
          <option value="subject">{t("placementSubject")}</option>
        </select>
        {form.placement === "subject" && (
          <input
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder={t("subjectPlaceholder")}
            className={inputClass}
          />
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950">
        <span className="text-xs font-medium text-neutral-500">{t("targetingTitle")}</span>

        <span className="text-[11px] text-neutral-400">{t("countriesLabel")}</span>
        <div className="flex flex-wrap gap-1.5">
          {countries.map((c) => (
            <label
              key={c.id}
              className={`flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                form.country_codes.includes(c.code) ? "bg-accent-blue text-white" : "bg-neutral-100 dark:bg-neutral-900"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={form.country_codes.includes(c.code)}
                onChange={() => toggleInArray("country_codes", c.code)}
              />
              {c.code}
            </label>
          ))}
        </div>

        <span className="text-[11px] text-neutral-400">{t("levelsLabel")}</span>
        <div className="flex flex-wrap gap-1.5">
          {levels.map((l) => (
            <label
              key={l.id}
              className={`flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                form.education_level_ids.includes(l.id) ? "bg-accent-blue text-white" : "bg-neutral-100 dark:bg-neutral-900"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={form.education_level_ids.includes(l.id)}
                onChange={() => toggleInArray("education_level_ids", l.id)}
              />
              {l.country_code} — {l.label}
            </label>
          ))}
        </div>

        <span className="text-[11px] text-neutral-400">{t("languagesLabel")}</span>
        <div className="flex gap-1.5">
          {["fr", "en"].map((lang) => (
            <label
              key={lang}
              className={`flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                form.languages.includes(lang) ? "bg-accent-blue text-white" : "bg-neutral-100 dark:bg-neutral-900"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={form.languages.includes(lang)}
                onChange={() => toggleInArray("languages", lang)}
              />
              {lang.toUpperCase()}
            </label>
          ))}
        </div>

        <input
          type="number"
          value={form.min_genie_points}
          onChange={(e) => setForm({ ...form, min_genie_points: e.target.value })}
          placeholder={t("minPointsPlaceholder")}
          className={inputClass}
        />

        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-[11px] text-neutral-400">
            {t("startsAtLabel")}
            <input
              type="date"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-[11px] text-neutral-400">
            {t("endsAtLabel")}
            <input
              type="date"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              className={inputClass}
            />
          </label>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
        {t("activeLabel")}
      </label>

      <div className="flex gap-2">
        <button onClick={onSave} className="min-h-9 rounded-xl bg-accent-blue px-3 text-xs font-medium text-white">
          {tc("save")}
        </button>
        <button onClick={onCancel} className="min-h-9 rounded-xl border border-neutral-200 px-3 text-xs font-medium dark:border-neutral-800">
          {tc("cancel")}
        </button>
      </div>
    </div>
  );
}
