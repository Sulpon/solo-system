"use client";

import { useState } from "react";
import Card from "../Card";
import { useCharacter } from "../../_lib/hooks/useCharacter";
import { useProgression } from "../../_lib/hooks/useProgression";
import { getRankLabel } from "../../_lib/engines/level-engine";
import CharacterViewer from "./CharacterViewer";
import WardrobeSection from "./WardrobeSection";
import HairstylesSection from "./HairstylesSection";
import PhysicalProfileSection from "./PhysicalProfileSection";
import ReferencePhotosSection from "./ReferencePhotosSection";

type PageTab = "character" | "wardrobe" | "hairstyles" | "physical" | "photos";

const TABS: ReadonlyArray<{ id: PageTab; label: string }> = [
  { id: "character", label: "Character" },
  { id: "wardrobe", label: "Wardrobe" },
  { id: "hairstyles", label: "Hairstyles" },
  { id: "physical", label: "Physical Profile" },
  { id: "photos", label: "Reference Photos" },
];

export default function CharacterPageClient() {
  const character = useCharacter();
  const { isReady: progressionReady, progressionSummary } = useProgression();
  const [tab, setTab] = useState<PageTab>("character");

  if (!character.hasLoaded || !progressionReady) {
    return (
      <Card className="p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">Loading Character...</div>
      </Card>
    );
  }

  const rank = getRankLabel(progressionSummary.currentLevel);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap gap-2">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={
                "rounded-xl border px-4 py-2 text-sm font-semibold transition " +
                (tab === entry.id ? "border-purple-400/60 bg-purple-500/15 text-white" : "border-slate-700 text-slate-400 hover:border-purple-500/40 hover:text-white")
              }
            >
              {entry.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        {tab === "character" ? (
          <CharacterViewer
            view={character.characterProfile.profile.view}
            onChangeView={character.characterProfile.setView}
            referencePhotos={character.referencePhotos.photos}
            equippedItems={character.equippedItems.equipped}
            wardrobeItems={character.wardrobe.items}
            activeHairstyle={character.activeHairstyle}
            level={progressionSummary.currentLevel}
            rank={rank}
          />
        ) : null}

        {tab === "wardrobe" ? (
          <WardrobeSection
            items={character.wardrobe.items}
            equipped={character.equippedItems.equipped}
            onAdd={character.wardrobe.addItem}
            onDelete={character.wardrobe.deleteItem}
            onEquip={character.equippedItems.equip}
            onUnequip={character.equippedItems.unequip}
          />
        ) : null}

        {tab === "hairstyles" ? (
          <HairstylesSection
            hairstyles={character.hairstyles.hairstyles}
            onAdd={character.hairstyles.addHairstyle}
            onDelete={character.hairstyles.deleteHairstyle}
            onSetActive={character.hairstyles.setActiveHairstyle}
          />
        ) : null}

        {tab === "physical" ? <PhysicalProfileSection latestMeasurement={character.latestMeasurement} /> : null}

        {tab === "photos" ? (
          <ReferencePhotosSection photos={character.referencePhotos.photos} onSetSlotPhoto={character.referencePhotos.setSlotPhoto} onRemoveSlotPhoto={character.referencePhotos.removeSlotPhoto} />
        ) : null}
      </Card>
    </div>
  );
}
