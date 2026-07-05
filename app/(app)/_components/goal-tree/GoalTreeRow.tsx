"use client";

import type { ReactNode } from "react";
import GoalProgressCell from "./GoalProgressCell";
import GoalTypeBadge from "./GoalTypeBadge";
import type { GoalTreeOutlineRowView } from "./goal-tree-outline.types";
import type { GoalNodeType } from "../../_lib/types/goal-tree";

type GoalTreeRowProps = Readonly<{
  row: GoalTreeOutlineRowView;
  isSelected: boolean;
  isCollapsed: boolean;
  onSelect: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
}>;

function Chevron({ open }: Readonly<{ open: boolean }>) {
  return (
    <svg viewBox="0 0 16 16" className={"h-3.5 w-3.5 transition " + (open ? "rotate-90" : "rotate-0")} fill="none" aria-hidden="true">
      <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NodeIcon({ type }: Readonly<{ type: GoalNodeType }>) {
  const iconStyles: Record<GoalNodeType, string> = {
    dream: "border-purple-400/35 bg-purple-500/10 text-purple-200",
    long_term_goal: "border-cyan-400/35 bg-cyan-400/10 text-cyan-100",
    milestone: "border-amber-400/35 bg-amber-400/10 text-amber-100",
    quest: "border-emerald-400/35 bg-emerald-400/10 text-emerald-100",
    progress_goal: "border-orange-400/35 bg-orange-400/10 text-orange-100",
    sequential_milestone: "border-fuchsia-400/35 bg-fuchsia-500/10 text-fuchsia-100",
  };

  const glyphs: Record<GoalNodeType, ReactNode> = {
    dream: (
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M8 1.5L13 8L8 14.5L3 8L8 1.5Z" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
    long_term_goal: (
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8" cy="8" r="2" fill="currentColor" />
      </svg>
    ),
    milestone: (
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M3 12.5V3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M3 4.5H11L9.8 7L11 9.5H3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
    quest: (
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 8.5L7.1 10.5L11 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    progress_goal: (
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M2.5 12.5H13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <rect x="4" y="8.5" width="1.8" height="3" rx="0.6" fill="currentColor" />
        <rect x="7.1" y="6.5" width="1.8" height="5" rx="0.6" fill="currentColor" />
        <rect x="10.2" y="4.5" width="1.8" height="7" rx="0.6" fill="currentColor" />
      </svg>
    ),
    sequential_milestone: (
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M4 4.5H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M4 8H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M4 11.5H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="2.5" cy="4.5" r="1" fill="currentColor" />
        <circle cx="2.5" cy="8" r="1" fill="currentColor" />
        <circle cx="2.5" cy="11.5" r="1" fill="currentColor" />
      </svg>
    ),
  };

  return (
    <span className={"inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border " + iconStyles[type]} aria-hidden="true">
      {glyphs[type]}
    </span>
  );
}

function StatusPill({ status }: Readonly<{ status: "not_started" | "in_progress" | "completed" }>) {
  const styles: Record<"not_started" | "in_progress" | "completed", string> = {
    not_started: "border-slate-700 bg-slate-950/55 text-slate-400",
    in_progress: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    completed: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  };

  const labels: Record<"not_started" | "in_progress" | "completed", string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
  };

  const dotStyles: Record<"not_started" | "in_progress" | "completed", string> = {
    not_started: "bg-slate-500",
    in_progress: "bg-cyan-300",
    completed: "bg-emerald-300",
  };

  return (
    <span className={"inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold whitespace-nowrap " + styles[status]}>
      <span className={"h-2 w-2 rounded-full " + dotStyles[status]} />
      {labels[status]}
    </span>
  );
}

function formatUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return "Today";
  }

  const now = new Date();
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();

  if (sameDay) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sameYesterday = date.getFullYear() === yesterday.getFullYear() && date.getMonth() === yesterday.getMonth() && date.getDate() === yesterday.getDate();

  if (sameYesterday) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export default function GoalTreeRow({ row, isSelected, isCollapsed, onSelect, onToggleCollapse }: GoalTreeRowProps) {
  const { node, depth } = row;
  const hasChildren = node.children.length > 0;
  const indentSize = Math.min(depth * 1.15, 6);

  return (
    <div
      className={
        "grid cursor-pointer grid-cols-[minmax(360px,1fr)_180px_minmax(240px,300px)_150px_110px] items-center border-b border-slate-800/70 px-5 py-3 transition " +
        (isSelected ? "bg-purple-500/10 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.25)]" : "hover:bg-slate-900/45")
      }
      data-selected={isSelected ? "true" : "false"}
      onClick={() => onSelect(node.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(node.id);
        }
      }}
    >
      <div className="min-w-0 pr-4" style={{ paddingLeft: `${indentSize}rem` }}>
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex shrink-0 items-center gap-1 pt-0.5">
            {hasChildren ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleCollapse(node.id);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-slate-300 transition hover:border-purple-400/60 hover:text-white"
                aria-label={isCollapsed ? "Expand node" : "Collapse node"}
              >
                <Chevron open={!isCollapsed} />
              </button>
            ) : (
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/70 text-slate-500">•</span>
            )}
            <NodeIcon type={node.type} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold leading-tight text-white sm:text-base">{node.title}</h3>
            {node.description ? <p className="mt-1 line-clamp-2 max-w-full text-xs leading-snug text-slate-500 sm:text-sm">{node.description}</p> : null}
          </div>
        </div>
      </div>

      <div className="pr-3">
        <GoalTypeBadge type={node.type} compact />
      </div>

      <div className="min-w-0 pr-3">
        <GoalProgressCell node={node} />
      </div>

      <div className="pr-3">
        <StatusPill status={node.status} />
      </div>

      <div className="whitespace-nowrap text-sm text-slate-400">{formatUpdatedAt(node.updatedAt)}</div>
    </div>
  );
}
