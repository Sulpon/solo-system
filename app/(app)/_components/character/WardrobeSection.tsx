"use client";

import { useState } from "react";
import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import type { WardrobeItemDraft } from "../../_lib/hooks/useWardrobe";
import type { EquipSlot, EquippedItems, WardrobeCategory, WardrobeItem } from "../../_lib/types/player-character";
import WardrobeItemForm from "./WardrobeItemForm";

const EQUIP_SLOTS: ReadonlySet<WardrobeCategory> = new Set<WardrobeCategory>(["top", "bottom", "underwear", "outerwear", "footwear", "accessory"]);

type WardrobeSectionProps = Readonly<{
  items: ReadonlyArray<WardrobeItem>;
  equipped: EquippedItems;
  onAdd: (draft: WardrobeItemDraft) => void;
  onDelete: (id: string) => void;
  onEquip: (slot: EquipSlot, itemId: string) => void;
  onUnequip: (slot: EquipSlot) => void;
}>;

function WardrobeItemThumbnail({ photoId }: Readonly<{ photoId: string }>) {
  const url = useDocumentPhotoUrl(photoId);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
  ) : (
    <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-800" />
  );
}

export default function WardrobeSection({ items, equipped, onAdd, onDelete, onEquip, onUnequip }: WardrobeSectionProps) {
  const [showForm, setShowForm] = useState(false);

  function isEquipped(item: WardrobeItem) {
    return EQUIP_SLOTS.has(item.category) && equipped[item.category as EquipSlot] === item.id;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Wardrobe</p>
        {!showForm ? (
          <button type="button" onClick={() => setShowForm(true)} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
            + Add Clothing
          </button>
        ) : null}
      </div>

      {showForm ? (
        <WardrobeItemForm
          onSave={(draft) => {
            onAdd(draft);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-4 text-center text-sm text-slate-400">No wardrobe items yet.</div>
        ) : (
          items.map((item) => {
            const equippedNow = isEquipped(item);
            const canEquip = EQUIP_SLOTS.has(item.category);

            return (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5">
                {item.photoId ? <WardrobeItemThumbnail photoId={item.photoId} /> : <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-800" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.category}
                    {item.brand ? ` · ${item.brand}` : ""}
                    {item.color ? ` · ${item.color}` : ""}
                  </p>
                </div>
                {canEquip ? (
                  <button
                    type="button"
                    onClick={() => (equippedNow ? onUnequip(item.category as EquipSlot) : onEquip(item.category as EquipSlot, item.id))}
                    className={
                      "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition " +
                      (equippedNow ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25" : "border-slate-700 text-slate-300 hover:border-purple-400/60 hover:text-white")
                    }
                  >
                    {equippedNow ? "Equipped" : "Equip"}
                  </button>
                ) : null}
                <button type="button" onClick={() => onDelete(item.id)} className="shrink-0 text-xs text-rose-300 hover:text-rose-200">
                  Delete
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
