"use client";

import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useLocalStorageState } from "./use-local-storage-state";

type Position = Readonly<{ x: number; y: number }>;
type Size = Readonly<{ width: number; height: number }>;

// A small, self-contained pointer-drag primitive for a single freely
// positioned floating panel - deliberately not @dnd-kit, which this app
// already uses for sortable-list reordering (Dashboard's widget grid,
// Attributes' CustomizablePage, Quest checklists) and would be the wrong
// tool here. Position persists via the same useLocalStorageState every
// other piece of Atlas state uses, so it survives reloads like everything
// else - this is device-local UI state (like the Tauri Companion's window
// position), never part of the cloud-synced menace-* snapshot unless the
// caller explicitly passes a "menace-"-prefixed key.
export function useDraggablePosition(storageKey: string, defaultPosition: Position, size: Size) {
  const [position, setPosition] = useLocalStorageState<Position>(storageKey, defaultPosition);
  const dragOrigin = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number } | null>(null);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if ((event.target as HTMLElement).closest("button")) {
        return;
      }

      dragOrigin.current = { pointerX: event.clientX, pointerY: event.clientY, startX: position.x, startY: position.y };

      function handlePointerMove(moveEvent: PointerEvent) {
        if (!dragOrigin.current) {
          return;
        }

        const nextX = dragOrigin.current.startX + (moveEvent.clientX - dragOrigin.current.pointerX);
        const nextY = dragOrigin.current.startY + (moveEvent.clientY - dragOrigin.current.pointerY);
        const maxX = Math.max(0, window.innerWidth - size.width);
        const maxY = Math.max(0, window.innerHeight - size.height);

        setPosition({ x: Math.min(Math.max(0, nextX), maxX), y: Math.min(Math.max(0, nextY), maxY) });
      }

      function handlePointerUp() {
        dragOrigin.current = null;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      }

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [position, setPosition, size.width, size.height],
  );

  return { position, handlePointerDown } as const;
}
