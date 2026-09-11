"use client";

import Link from "next/link";
import type { RelatedEntityGroup } from "../../_lib/relationships";

type RelatedEntitiesPanelProps = Readonly<{
  title?: string;
  groups: ReadonlyArray<RelatedEntityGroup>;
  // Optional per-entity click handler (e.g. select a Quest in-page instead
  // of navigating) - falls back to a real Link using the entity's own href
  // when omitted.
  onSelectEntity?: (entityId: string, groupLabel: string) => void;
}>;

// The one reusable "CONNECTED" panel Phase 4 asks for - every caller
// (Goal, Quest, Skill, Note...) supplies its own groups via
// _lib/relationships.ts's query functions; this component only renders
// what it's given and never invents a group. Empty relationship sets
// already get filtered out by those query functions (nonEmptyGroups), so
// an entity with zero real connections renders nothing here at all rather
// than an empty "Connected" shell.
export default function RelatedEntitiesPanel({ title = "Connected", groups, onSelectEntity }: RelatedEntitiesPanelProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">{title}</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{group.label}</p>
            <ul className="mt-1.5 space-y-1">
              {group.entities.map((entity) => (
                <li key={entity.id}>
                  {onSelectEntity ? (
                    <button
                      type="button"
                      onClick={() => onSelectEntity(entity.id, group.label)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-1 text-left text-sm text-slate-300 transition hover:border-slate-700 hover:bg-slate-900/60 hover:text-white"
                    >
                      <span className="truncate">{entity.title}</span>
                      {entity.meta ? <span className="shrink-0 text-[10px] text-slate-500">{entity.meta}</span> : null}
                    </button>
                  ) : entity.href ? (
                    <Link
                      href={entity.href}
                      className="flex items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-1 text-sm text-slate-300 transition hover:border-slate-700 hover:bg-slate-900/60 hover:text-white"
                    >
                      <span className="truncate">{entity.title}</span>
                      {entity.meta ? <span className="shrink-0 text-[10px] text-slate-500">{entity.meta}</span> : null}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm text-slate-400">
                      <span className="truncate">{entity.title}</span>
                      {entity.meta ? <span className="shrink-0 text-[10px] text-slate-500">{entity.meta}</span> : null}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
