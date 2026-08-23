"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { CHARACTER_VIEWS, DEFAULT_AVATAR_CONFIG } from "../../_lib/types/player-character";

type CameraPresetId = "full" | "upper" | "face";

type Bounds = Readonly<{ centerX: number; centerZ: number; maxY: number; minY: number; height: number }>;

type CameraState = { targetY: number; targetDistance: number; currentY: number; currentDistance: number; zoomOffset: number };

type RotationState = { current: number; target: number; dragging: boolean };

const CHARACTER_ANGLES: Record<"front" | "left" | "back" | "right", number> = {
  front: 0,
  left: Math.PI / 2,
  back: Math.PI,
  right: -Math.PI / 2,
};

const FOV_DEGREES = 30;

function normalizeAngle(angle: number) {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function lerpAngle(current: number, target: number, t: number) {
  const diff = normalizeAngle(target - current + Math.PI) - Math.PI;
  return current + diff * t;
}

function presetFor(id: CameraPresetId, bounds: Bounds): Readonly<{ targetY: number; targetDistance: number }> {
  const fovRad = (FOV_DEGREES * Math.PI) / 180;
  const distanceForFraction = (fraction: number, padding: number) => ((bounds.height * fraction) / (2 * Math.tan(fovRad / 2))) * padding;

  if (id === "face") {
    return { targetY: bounds.maxY - bounds.height * 0.06, targetDistance: distanceForFraction(0.16, 1.5) };
  }

  if (id === "upper") {
    return { targetY: bounds.minY + bounds.height * 0.58, targetDistance: distanceForFraction(0.58, 1.3) };
  }

  return { targetY: bounds.minY + bounds.height * 0.5, targetDistance: distanceForFraction(1.05, 1.15) };
}

type AvatarModelProps = Readonly<{
  modelUrl: string;
  hiddenMeshNames: ReadonlyArray<string>;
  rotationState: React.MutableRefObject<RotationState>;
  cameraState: React.MutableRefObject<CameraState>;
  boundsRef: React.MutableRefObject<Bounds | null>;
  onBoundsReady: (bounds: Bounds) => void;
}>;

function AvatarModel({ modelUrl, hiddenMeshNames, rotationState, cameraState, boundsRef, onBoundsReady }: AvatarModelProps) {
  const { scene } = useGLTF(modelUrl);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const bounds: Bounds = {
      centerX: (box.min.x + box.max.x) / 2,
      centerZ: (box.min.z + box.max.z) / 2,
      maxY: box.max.y,
      minY: box.min.y,
      height: Math.max(0.01, box.max.y - box.min.y),
    };
    boundsRef.current = bounds;
    onBoundsReady(bounds);
    // scene is a stable cached object per modelUrl (see useGLTF caching) - this
    // measurement only needs to run once per model, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useEffect(() => {
    scene.traverse((child) => {
      if (hiddenMeshNames.includes(child.name)) {
        child.visible = false;
      } else if (["avaturn_body", "avaturn_hair_0", "avaturn_hair_1", "avaturn_shoes_0", "avaturn_look_0"].includes(child.name)) {
        child.visible = true;
      }
    });
  }, [scene, hiddenMeshNames]);

  useFrame((_, delta) => {
    const rotation = rotationState.current;
    if (!rotation.dragging && groupRef.current) {
      rotation.current = lerpAngle(rotation.current, rotation.target, Math.min(1, delta * 6));
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = rotation.current;
    }

    const bounds = boundsRef.current;
    if (bounds) {
      const cam = cameraState.current;
      const dampT = Math.min(1, delta * 5);
      cam.currentY += (cam.targetY - cam.currentY) * dampT;
      cam.currentDistance += (cam.targetDistance - cam.currentDistance) * dampT;
      const distance = Math.max(0.15, cam.currentDistance + cam.zoomOffset);
      camera.position.set(bounds.centerX, cam.currentY, bounds.centerZ + distance);
      camera.lookAt(bounds.centerX, cam.currentY, bounds.centerZ);
    }
  });

  return (
    <group ref={groupRef} dispose={null}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

type AvatarStageProps = Readonly<{
  modelUrl: string;
  hiddenMeshNames: ReadonlyArray<string>;
}>;

export default function AvatarStage({ modelUrl, hiddenMeshNames }: AvatarStageProps) {
  const rotationState = useRef<RotationState>({ current: 0, target: 0, dragging: false });
  const cameraState = useRef<CameraState>({ targetY: 1, targetDistance: 3, currentY: 1, currentDistance: 3, zoomOffset: 0 });
  const boundsRef = useRef<Bounds | null>(null);
  const dragStartRef = useRef({ x: 0, rotation: 0 });
  const [activeView, setActiveView] = useState<"front" | "left" | "back" | "right">("front");
  const [activePreset, setActivePreset] = useState<CameraPresetId>("full");
  const [ready, setReady] = useState(false);

  const handleBoundsReady = useCallback((bounds: Bounds) => {
    const preset = presetFor("full", bounds);
    cameraState.current.targetY = preset.targetY;
    cameraState.current.targetDistance = preset.targetDistance;
    cameraState.current.currentY = preset.targetY;
    cameraState.current.currentDistance = preset.targetDistance;
    setReady(true);
  }, []);

  function setView(view: "front" | "left" | "back" | "right") {
    rotationState.current.target = CHARACTER_ANGLES[view];
    setActiveView(view);
  }

  function setPreset(preset: CameraPresetId) {
    const bounds = boundsRef.current;
    if (!bounds) return;
    const { targetY, targetDistance } = presetFor(preset, bounds);
    cameraState.current.targetY = targetY;
    cameraState.current.targetDistance = targetDistance;
    cameraState.current.zoomOffset = 0;
    setActivePreset(preset);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    rotationState.current.dragging = true;
    dragStartRef.current = { x: event.clientX, rotation: rotationState.current.current };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!rotationState.current.dragging) return;
    const deltaX = event.clientX - dragStartRef.current.x;
    const nextRotation = dragStartRef.current.rotation + deltaX * 0.012;
    rotationState.current.current = nextRotation;
    rotationState.current.target = nextRotation;
  }

  function handlePointerUp() {
    rotationState.current.dragging = false;
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    const bounds = boundsRef.current;
    if (!bounds) return;
    event.preventDefault();
    const next = cameraState.current.zoomOffset + event.deltaY * 0.0025;
    cameraState.current.zoomOffset = Math.max(-cameraState.current.targetDistance * 0.6, Math.min(1.5, next));
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative aspect-[3/4] w-full max-w-md touch-none overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-black shadow-[0_0_55px_rgba(124,58,237,0.22)]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {!ready ? <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-slate-500">Loading avatar...</div> : null}
        <Canvas camera={{ fov: FOV_DEGREES, near: 0.1, far: 50 }} dpr={[1, 2]}>
          <ambientLight intensity={0.65} />
          <hemisphereLight args={["#a5b4fc", "#0f172a", 0.55]} />
          <directionalLight position={[2, 4, 3]} intensity={1.1} />
          <directionalLight position={[-2, 2, -2]} intensity={0.35} />
          <Suspense fallback={null}>
            <AvatarModel modelUrl={modelUrl} hiddenMeshNames={hiddenMeshNames} rotationState={rotationState} cameraState={cameraState} boundsRef={boundsRef} onBoundsReady={handleBoundsReady} />
          </Suspense>
        </Canvas>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Previous view"
          onClick={() => setView(CHARACTER_VIEWS[(CHARACTER_VIEWS.indexOf(activeView) + 3) % 4])}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-purple-500/30 bg-slate-950/70 text-xl text-purple-200 transition hover:border-purple-400/60 hover:text-white"
        >
          ←
        </button>
        <span className="w-24 text-center text-xs font-bold uppercase tracking-[0.2em] text-purple-200">
          {activeView === "left" ? "Left Side" : activeView === "right" ? "Right Side" : activeView}
        </span>
        <button
          type="button"
          aria-label="Next view"
          onClick={() => setView(CHARACTER_VIEWS[(CHARACTER_VIEWS.indexOf(activeView) + 1) % 4])}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-purple-500/30 bg-slate-950/70 text-xl text-purple-200 transition hover:border-purple-400/60 hover:text-white"
        >
          →
        </button>
      </div>

      <div className="flex items-center gap-2">
        {(["front", "left", "back", "right"] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setView(view)}
            aria-label={`Switch to ${view} view`}
            className={"h-2 w-2 rounded-full transition " + (view === activeView ? "bg-purple-400" : "bg-slate-700 hover:bg-slate-500")}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        {(
          [
            ["full", "Full Body"],
            ["upper", "Upper Body"],
            ["face", "Face"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPreset(id)}
            className={
              "rounded-lg border px-3 py-1.5 text-xs font-semibold transition " +
              (activePreset === id ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100" : "border-slate-700 text-slate-400 hover:border-cyan-400/40 hover:text-white")
            }
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-slate-500">Drag to rotate · Scroll to zoom</p>
    </div>
  );
}

useGLTF.preload(DEFAULT_AVATAR_CONFIG.modelUrl);
