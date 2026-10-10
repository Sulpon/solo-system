"use client";

import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { getBranchState, type GoalTreeRow } from "../../../_lib/engines/goal-tree-graph";
import { HIERARCHY_LEVELS } from "./hierarchy-levels";
import type { GoalNode, GoalNodePeriodType } from "../../../_lib/types/goal-tree";

type GoalTreeGraphProps = Readonly<{
  rows: ReadonlyArray<GoalTreeRow>;
  selectedId: string | null;
  today: Date;
  onToggle: (nodeId: string) => void;
  onSelect: (node: GoalNode) => void;
  // Null when this node's level cannot take a child, with the reason to
  // show instead of a dead "+".
  addChildLabel: (node: GoalNode) => string | null;
  onAddChild: (node: GoalNode) => void;
}>;

// One restrained accent per state. "Blocked" is absent on purpose - see
// goal-tree-graph.ts: Atlas models no blocker, so there is nothing to
// colour red without inventing it.
const STATE_STYLE: Readonly<Record<ReturnType<typeof getBranchState>, { dot: string; text: string; label: string }>> = {
  completed: { dot: "bg-emerald-300/80", text: "text-emerald-200/90", label: "Completed" },
  at_risk: { dot: "bg-amber-300/80", text: "text-amber-200/90", label: "Past its period" },
  in_progress: { dot: "bg-sky-300/80", text: "text-sky-200/90", label: "In progress" },
  not_started: { dot: "bg-white/25", text: "atlas-muted", label: "Not started" },
};

const INDENT_REM = 1.5;

// The connector for one row: a vertical rail for each ancestor that still
// has work below it, then the elbow into this node. Drawn with plain
// divs at a fixed indent rather than measured SVG, so it stays correct
// when a row wraps to two lines and costs no layout pass.
function Connectors({ row }: Readonly<{ row: GoalTreeRow }>) {
  return (
    <>
      {row.ancestorRails.map((continues, index) => (
        <span key={index} className="relative shrink-0" style={{ width: `${INDENT_REM}rem` }} aria-hidden>
          {continues ? <span className="absolute inset-y-0 left-1/2 w-px bg-white/[0.08]" /> : null}
        </span>
      ))}

      {row.depth > 0 ? (
        <span className="relative shrink-0" style={{ width: `${INDENT_REM}rem` }} aria-hidden>
          {/* Down to the elbow, then stopping if this is the last child. */}
          <span className={"absolute left-1/2 w-px bg-white/[0.08] " + (row.isLastChild ? "top-0 h-1/2" : "inset-y-0")} />
          <span className="absolute left-1/2 top-1/2 h-px w-1/2 bg-white/[0.08]" />
        </span>
      ) : null}
    </>
  );
}

// The Goal Tree as an actual connected hierarchy: every row is a real
// GoalNode, every indent is a real parent/child edge, and progress is the
// node's own rolled-up value. Nothing here computes or stores anything.
export default function GoalTreeGraph({ rows, selectedId, today, onToggle, onSelect, addChildLabel, onAddChild }: GoalTreeGraphProps) {
  return (
    <div role="tree" aria-label="Goal hierarchy" className="space-y-0.5" data-testid="goal-tree-graph">
      {rows.map((row) => {
        const { node } = row;
        const state = getBranchState(node, today);
        const style = STATE_STYLE[state];
        const level = node.periodType ? HIERARCHY_LEVELS[node.periodType as GoalNodePeriodType] : null;
        const isSelected = node.id === selectedId;
        const progress = Math.min(100, Math.max(0, Math.round(node.progress)));
        const addLabel = addChildLabel(node);

        return (
          <div
            key={node.id}
            role="treeitem"
            aria-level={row.depth + 1}
            aria-selected={isSelected}
            aria-expanded={row.childCount > 0 ? row.isExpanded : undefined}
            data-testid={`tree-row-${node.id}`}
            data-depth={row.depth}
            data-state={state}
            className="flex items-stretch"
          >
            <Connectors row={row} />

            <div
              className={
                "flex min-w-0 flex-1 items-center gap-2 rounded-lg border py-1.5 pl-1.5 pr-2 transition " +
                (isSelected ? "border-[rgb(var(--atlas-accent,168_85_247)/0.5)] bg-[rgb(var(--atlas-accent,168_85_247)/0.1)]" : "border-transparent hover:border-white/[0.08] hover:bg-white/[0.03]")
              }
            >
              {row.childCount > 0 ? (
                <button
                  type="button"
                  onClick={() => onToggle(node.id)}
                  aria-label={`${row.isExpanded ? "Collapse" : "Expand"} ${node.title}`}
                  data-testid={`tree-toggle-${node.id}`}
                  className="atlas-muted shrink-0 rounded p-0.5 transition hover:text-white"
                >
                  {row.isExpanded ? <ChevronDown aria-hidden className="h-3.5 w-3.5" /> : <ChevronRight aria-hidden className="h-3.5 w-3.5" />}
                </button>
              ) : (
                <span className="w-[1.125rem] shrink-0" aria-hidden />
              )}

              <span className={"h-2 w-2 shrink-0 rounded-full " + style.dot} title={style.label} aria-hidden />

              <button
                type="button"
                onClick={() => onSelect(node)}
                className="min-w-0 flex-1 truncate text-left text-sm text-white/90 transition hover:text-white"
              >
                {node.title}
              </button>

              {level ? <span className={"hidden shrink-0 text-[0.6rem] uppercase tracking-[0.16em] sm:inline " + level.accentText}>{level.label}</span> : null}

              {row.childCount > 0 ? <span className="atlas-muted shrink-0 text-[0.68rem]">{row.childCount}</span> : null}

              <span className="hidden h-1 w-16 shrink-0 overflow-hidden rounded-full bg-white/[0.07] sm:block" aria-hidden>
                <span className={"block h-full rounded-full " + style.dot} style={{ width: `${progress}%` }} />
              </span>

              <span className={"w-9 shrink-0 text-right text-[0.68rem] tabular-nums " + style.text}>{progress}%</span>

              {addLabel ? (
                <button
                  type="button"
                  onClick={() => onAddChild(node)}
                  title={addLabel}
                  aria-label={addLabel}
                  data-testid={`tree-add-${node.id}`}
                  className="atlas-muted shrink-0 rounded p-0.5 opacity-0 transition hover:text-white focus:opacity-100 group-hover:opacity-100 [div:hover>&]:opacity-100"
                >
                  <Plus aria-hidden className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
