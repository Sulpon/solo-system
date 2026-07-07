"use client";

import type { GoalTreeOutlineRowView } from "./goal-tree-outline.types";
import GoalTreeRow from "./GoalTreeRow";

type GoalTreeTableProps = Readonly<{
  rows: GoalTreeOutlineRowView[];
  selectedNodeId: string | null;
  collapsedIds: ReadonlySet<string>;
  onSelectNode: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
}>;

export default function GoalTreeTable({ rows, selectedNodeId, collapsedIds, onSelectNode, onToggleCollapse }: GoalTreeTableProps) {
  return (
    <div className="relative rounded-2xl border border-slate-800/90 bg-slate-950/45 shadow-[0_0_30px_rgba(15,23,42,0.25)]">
      <div className="overflow-x-auto rounded-2xl">
        <div className="min-w-[1280px]">
          <div className="grid grid-cols-[minmax(360px,1fr)_180px_minmax(240px,300px)_150px_110px] border-b border-slate-800/80 bg-slate-950/80 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <div>Name</div>
            <div>Type</div>
            <div>Progress</div>
            <div>Status</div>
            <div>Updated</div>
          </div>

          <div>
            {rows.map((row) => (
              <GoalTreeRow
                key={row.node.id}
                row={row}
                isSelected={selectedNodeId === row.node.id}
                isCollapsed={collapsedIds.has(row.node.id)}
                onSelect={onSelectNode}
                onToggleCollapse={onToggleCollapse}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-2xl bg-gradient-to-l from-slate-950/90 to-transparent" aria-hidden="true" />
      <p className="pointer-events-none absolute bottom-2 right-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">Scroll for more →</p>
    </div>
  );
}
