"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useProgression } from "../../_lib/hooks/useProgression";
import { describeAttributeImpact, removeAttribute, summariseAttributeImpact } from "../../_lib/engines/attribute-removal-engine";
import type { CategoryId } from "../../_lib/types/category";

// Attributes own their own routes (/attributes/[attributeId]), so from the
// outside each one reads as a page. Until now they could only be chosen,
// during onboarding, and never removed - picking one extra preset meant
// living with the page forever.
//
// Removal goes through setAttributes like any other collection write, which
// means the deletion is tombstoned and reaches every other device instead
// of being undone by the next cloud merge. See sync/deletion-tombstones.ts.
export default function AttributePagesPanel() {
  const { attributes, setAttributes } = useAttributes();
  const { questDefinitions } = useProgression();
  const { goalTree } = useGoalTree();
  const [pendingId, setPendingId] = useState<CategoryId | null>(null);

  const impacts = useMemo(
    () => new Map(attributes.map((attribute) => [attribute.id, summariseAttributeImpact(attribute.id, questDefinitions, goalTree, attributes.length)])),
    [attributes, goalTree, questDefinitions],
  );

  function confirmRemoval(attributeId: CategoryId) {
    const impact = impacts.get(attributeId);
    const attribute = attributes.find((item) => item.id === attributeId);

    if (!impact || !attribute || impact.isLastAttribute) {
      return;
    }

    setAttributes(removeAttribute(attributes, attributeId));
    setPendingId(null);
  }

  if (attributes.length === 0) {
    return null;
  }

  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">Attributes</p>
      <h2 className="mt-2 text-xl font-black text-white">Attribute Pages</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Each attribute has its own page in Atlas. Removing one deletes the attribute and its page everywhere you are signed in. Your quests, goals and history are never deleted — anything still filed under it is kept, and reappears if you create an attribute with the same name again.
      </p>

      <div className="mt-5 space-y-3">
        {attributes.map((attribute) => {
          const impact = impacts.get(attribute.id);
          const isPending = pendingId === attribute.id;

          return (
            <div key={attribute.id} className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black text-slate-950 " + attribute.accent}>{attribute.icon}</span>
                  <div>
                    <h3 className="font-bold text-white">{attribute.name}</h3>
                    <p className="text-xs text-slate-500">/attributes/{attribute.id}</p>
                  </div>
                </div>

                {isPending ? null : (
                  <button
                    type="button"
                    onClick={() => setPendingId(attribute.id)}
                    disabled={impact?.isLastAttribute}
                    title={impact?.isLastAttribute ? "Atlas needs at least one attribute." : undefined}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-rose-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                )}
              </div>

              {isPending && impact ? (
                <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
                  <p className="text-sm font-semibold text-rose-100">Remove {attribute.name}?</p>
                  <p className="mt-2 text-sm text-rose-100/80">{describeAttributeImpact(impact)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => confirmRemoval(attribute.id)}
                      className="rounded-lg border border-rose-400/50 bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-500/30"
                    >
                      Remove attribute
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingId(null)}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
