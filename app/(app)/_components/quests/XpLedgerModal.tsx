"use client";

import Modal from "../Modal";
import { getXpLedgerEntriesForDay, getXpLedgerTotal } from "../../_lib/xp-ledger";
import type { XpEvent } from "../../_lib/types/progression";
import type { Quest, QuestCompletion } from "../../_lib/types/quest";

type XpLedgerModalProps = Readonly<{
  questDefinitions: ReadonlyArray<Quest>;
  questCompletions: ReadonlyArray<QuestCompletion>;
  goalXpEvents: ReadonlyArray<XpEvent>;
  bonusXpEvents: ReadonlyArray<XpEvent>;
  onClose: () => void;
}>;

export default function XpLedgerModal({ questDefinitions, questCompletions, goalXpEvents, bonusXpEvents, onClose }: XpLedgerModalProps) {
  const entries = getXpLedgerEntriesForDay(questDefinitions, questCompletions, goalXpEvents, bonusXpEvents);
  const total = getXpLedgerTotal(entries);

  return (
    <Modal title="XP Ledger" onClose={onClose}>
      <div className="space-y-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Today</p>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-6 text-center text-sm text-slate-400">No XP earned yet today.</div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm">
                <span className="truncate text-slate-300">{entry.title}</span>
                <span className="shrink-0 font-bold text-emerald-300">+{entry.amount.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <span className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Total</span>
          <span className="text-xl font-black text-white">+{total.toLocaleString()} XP</span>
        </div>
      </div>
    </Modal>
  );
}
