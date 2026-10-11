"use client";

import { useState } from "react";
import { Palette, Pencil, Plus, Trash2 } from "lucide-react";
import Card from "../Card";
import { usePageThemes } from "../../_lib/hooks/usePageThemes";
import { DOMAIN_THEMES } from "../../_lib/theme/domain-themes";
import {
  draftFromTheme,
  hexToRgbTriplet,
  rgbTripletToHex,
  validateDraft,
  type CustomThemeDraft,
} from "../../_lib/theme/custom-theme-engine";
import type { DomainMotion, DomainThemeId, DomainDisplayFont } from "../../_lib/theme/domain-themes";
import { THEMEABLE_PAGES, type CustomTheme } from "../../_lib/types/custom-theme";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-slate-500";

const BUILT_IN_IDS = Object.keys(DOMAIN_THEMES) as DomainThemeId[];

// A live sample, drawn with the same tokens the real page uses, so what
// is shown here is literally what the page will look like.
function ThemePreview({ draft }: Readonly<{ draft: CustomThemeDraft }>) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{ background: draft.surface, borderColor: draft.border, boxShadow: `0 0 40px rgba(${draft.accent.split(" ").join(", ")}, 0.16)` }}
    >
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em]" style={{ color: `rgb(${draft.accent})` }}>
        {draft.label || "Untitled theme"}
      </p>
      <p className="mt-1 text-sm font-bold text-white">A sample card</p>
      <p className="mt-0.5 text-xs" style={{ color: draft.muted }}>
        {draft.tagline || "No tagline"}
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-2/3 rounded-full" style={{ background: `rgb(${draft.accent})` }} />
      </div>
    </div>
  );
}

// Build your own themes and decide which page wears which.
//
// A custom theme is the same token set the built-in domain themes use, so
// nothing in Atlas needs to know it exists - every card, progress bar and
// accent already reads those CSS variables.
export default function PageThemesPanel() {
  const { settings, hasLoaded, saveTheme, removeTheme, setPageTheme } = usePageThemes();
  const [editing, setEditing] = useState<{ draft: CustomThemeDraft; existing: CustomTheme | null } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  if (!hasLoaded) {
    return (
      <Card className="p-5">
        <p className="atlas-muted text-sm">Loading themes...</p>
      </Card>
    );
  }

  const problems = editing ? validateDraft(editing.draft) : [];
  const problemFor = (field: keyof CustomThemeDraft) => problems.find((entry) => entry.field === field)?.message;

  function startNew() {
    setEditing({ draft: draftFromTheme(DOMAIN_THEMES["home-base"]), existing: null });
  }

  function startEdit(theme: CustomTheme) {
    setEditing({
      draft: {
        label: theme.label,
        tagline: theme.tagline,
        baseThemeId: (theme.baseThemeId as DomainThemeId) in DOMAIN_THEMES ? (theme.baseThemeId as DomainThemeId) : "home-base",
        accent: theme.tokens.accent,
        surface: theme.tokens.surface,
        border: theme.tokens.border,
        muted: theme.tokens.muted,
        motion: theme.motion,
        display: theme.display,
      },
      existing: theme,
    });
  }

  function patch(changes: Partial<CustomThemeDraft>) {
    setEditing((current) => (current ? { ...current, draft: { ...current.draft, ...changes } } : current));
  }

  return (
    <div className="space-y-4">
      <Card className="p-5" testId="custom-themes">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Palette aria-hidden className="h-4 w-4" />
              Custom themes
            </h2>
            <p className="atlas-muted mt-0.5 text-xs">Start from a built-in theme, change what you want, then pin it to any page.</p>
          </div>

          <button
            type="button"
            onClick={startNew}
            data-testid="new-theme"
            className="flex items-center gap-1.5 rounded-xl border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25"
          >
            <Plus aria-hidden className="h-3.5 w-3.5" />
            New theme
          </button>
        </div>

        {settings.customThemes.length === 0 ? (
          <p className="atlas-muted mt-4 text-xs">No custom themes yet. Every page uses its built-in look.</p>
        ) : (
          <ul className="mt-4 space-y-2" data-testid="custom-theme-list">
            {settings.customThemes.map((theme) => (
              <li key={theme.id} className="flex items-center gap-3 rounded-xl border border-slate-800 p-2.5" data-testid={`theme-${theme.id}`}>
                <span className="h-6 w-6 shrink-0 rounded-md border border-white/10" style={{ background: `rgb(${theme.tokens.accent})` }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">{theme.label}</span>
                  <span className="atlas-muted block truncate text-[0.68rem]">
                    based on {DOMAIN_THEMES[theme.baseThemeId as DomainThemeId]?.label ?? "a theme that no longer exists"}
                  </span>
                </span>

                <button type="button" onClick={() => startEdit(theme)} aria-label={`Edit ${theme.label}`} className="atlas-muted rounded p-1 transition hover:text-white">
                  <Pencil aria-hidden className="h-3.5 w-3.5" />
                </button>

                {confirmingDelete === theme.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      removeTheme(theme.id);
                      setConfirmingDelete(null);
                    }}
                    className="rounded-lg border border-rose-400/50 bg-rose-500/15 px-2 py-1 text-[0.68rem] font-semibold text-rose-200"
                  >
                    Delete, unpin pages
                  </button>
                ) : (
                  <button type="button" onClick={() => setConfirmingDelete(theme.id)} aria-label={`Delete ${theme.label}`} className="rounded p-1 text-rose-400/80 transition hover:text-rose-300">
                    <Trash2 aria-hidden className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing ? (
        <Card className="p-5" testId="theme-editor">
          <h3 className="text-sm font-bold text-white">{editing.existing ? `Editing ${editing.existing.label}` : "New theme"}</h3>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className={labelClass}>Name</span>
                <input value={editing.draft.label} onChange={(event) => patch({ label: event.target.value })} className={inputClass} data-testid="theme-label" />
                {problemFor("label") ? <span className="block text-[0.68rem] text-rose-300">{problemFor("label")}</span> : null}
              </label>

              <label className="block space-y-1.5">
                <span className={labelClass}>Tagline (optional)</span>
                <input value={editing.draft.tagline} onChange={(event) => patch({ tagline: event.target.value })} className={inputClass} />
              </label>

              <label className="block space-y-1.5">
                <span className={labelClass}>Based on</span>
                {/* The ambient wash and decorative motif come from here -
                    the editor does not expose them, so they are inherited
                    rather than invented. */}
                <select
                  value={editing.draft.baseThemeId}
                  onChange={(event) => {
                    const base = DOMAIN_THEMES[event.target.value as DomainThemeId];
                    patch({ baseThemeId: base.id, accent: base.tokens.accent, surface: base.tokens.surface, border: base.tokens.border, muted: base.tokens.muted });
                  }}
                  className={inputClass}
                >
                  {BUILT_IN_IDS.map((id) => (
                    <option key={id} value={id}>
                      {DOMAIN_THEMES[id].label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className={labelClass}>Accent</span>
                  <span className="flex items-center gap-2">
                    <input
                      type="color"
                      value={rgbTripletToHex(editing.draft.accent)}
                      onChange={(event) => patch({ accent: hexToRgbTriplet(event.target.value) ?? editing.draft.accent })}
                      aria-label="Accent colour"
                      data-testid="theme-accent"
                      className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
                    />
                    <input value={editing.draft.accent} onChange={(event) => patch({ accent: event.target.value })} className={inputClass} />
                  </span>
                  {problemFor("accent") ? <span className="block text-[0.68rem] text-rose-300">{problemFor("accent")}</span> : null}
                </label>

                <label className="block space-y-1.5">
                  <span className={labelClass}>Muted text</span>
                  <input value={editing.draft.muted} onChange={(event) => patch({ muted: event.target.value })} className={inputClass} />
                </label>

                <label className="block space-y-1.5">
                  <span className={labelClass}>Card surface</span>
                  <input value={editing.draft.surface} onChange={(event) => patch({ surface: event.target.value })} className={inputClass} />
                </label>

                <label className="block space-y-1.5">
                  <span className={labelClass}>Border</span>
                  <input value={editing.draft.border} onChange={(event) => patch({ border: event.target.value })} className={inputClass} />
                </label>

                <label className="block space-y-1.5">
                  <span className={labelClass}>Motion</span>
                  <select value={editing.draft.motion} onChange={(event) => patch({ motion: event.target.value as DomainMotion })} className={inputClass}>
                    {(["calm", "standard", "sharp"] as DomainMotion[]).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className={labelClass}>Display font</span>
                  <select value={editing.draft.display} onChange={(event) => patch({ display: event.target.value as DomainDisplayFont })} className={inputClass}>
                    {(["sans", "serif"] as DomainDisplayFont[]).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <span className={labelClass}>Preview</span>
              <ThemePreview draft={editing.draft} />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
              Cancel
            </button>
            <button
              type="button"
              disabled={problems.length > 0}
              onClick={() => {
                saveTheme(editing.draft, editing.existing);
                setEditing(null);
              }}
              data-testid="save-theme"
              className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save theme
            </button>
          </div>
        </Card>
      ) : null}

      <Card className="p-5" testId="page-theme-assignments">
        <h2 className="text-sm font-bold text-white">Theme per page</h2>
        <p className="atlas-muted mt-0.5 text-xs">
          Leave a page on Automatic to keep the look Atlas picks for it. A choice here also covers that page&apos;s sub-pages.
        </p>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {THEMEABLE_PAGES.map((entry) => {
            const assigned = settings.routeThemes[entry.prefix] ?? "";

            return (
              <li key={entry.prefix} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs text-white/80">{entry.label}</span>
                <select
                  value={assigned}
                  onChange={(event) => setPageTheme(entry.prefix, event.target.value || null)}
                  aria-label={`Theme for ${entry.label}`}
                  data-testid={`page-theme-${entry.prefix}`}
                  className="w-40 shrink-0 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-white outline-none transition focus:border-purple-400"
                >
                  <option value="">Automatic</option>
                  {settings.customThemes.length > 0 ? (
                    <optgroup label="Yours">
                      {settings.customThemes.map((theme) => (
                        <option key={theme.id} value={theme.id}>
                          {theme.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  <optgroup label="Built in">
                    {BUILT_IN_IDS.map((id) => (
                      <option key={id} value={id}>
                        {DOMAIN_THEMES[id].label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
