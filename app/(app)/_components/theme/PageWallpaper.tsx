"use client";

import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import { usePageBackdrop } from "../../_lib/hooks/usePageBackdrop";
import { environmentObjectPosition } from "../../_lib/theme/environments";
import type { Environment } from "../../_lib/theme/environments";
import type { Wallpaper } from "../../_lib/types/custom-theme";

// The picture behind a page: the user's own wallpaper if they pinned one,
// otherwise the domain's built-in environment.
//
// Rendered INSIDE ThemeBackground's single fixed layer rather than as a
// new wrapper, for the reason documented there: a wrapper would put
// another stacking/scroll container between the shell and pages that own
// their own drag contexts.
//
// It sits ABOVE the ambient wash on purpose. That wash ends in an opaque
// dark gradient, so a picture behind it would never be seen.

function UploadedWallpaper({ wallpaper }: Readonly<{ wallpaper: Wallpaper }>) {
  const url = useDocumentPhotoUrl(wallpaper.id);

  // Its bytes are not on this device - pictures live in the browser they
  // were uploaded in, same as every other attachment. Rendering nothing
  // is the honest answer; a broken frame behind the whole app is not.
  if (!url) {
    return null;
  }

  const tile = wallpaper.fit === "tile";

  return (
    <div aria-hidden data-testid="page-wallpaper" data-wallpaper-id={wallpaper.id} className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-center"
        style={{
          backgroundImage: `url(${url})`,
          backgroundSize: tile ? "auto" : wallpaper.fit,
          backgroundRepeat: tile ? "repeat" : "no-repeat",
          // Pushed outwards so the softened edge never shows as a pale
          // border around the viewport.
          filter: wallpaper.blur > 0 ? `blur(${wallpaper.blur}px)` : undefined,
          transform: wallpaper.blur > 0 ? `scale(${1 + wallpaper.blur / 100})` : undefined,
        }}
      />
      <div className="absolute inset-0 bg-black" style={{ opacity: wallpaper.dim }} />
    </div>
  );
}

function DomainEnvironment({ environment, src }: Readonly<{ environment: Environment; src: string }>) {
  return (
    <div aria-hidden data-testid="page-environment" data-environment-id={environment.id} className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- a full-bleed
          backdrop, not content: next/image would add a layout wrapper
          inside this fixed layer for no benefit at one image per page.
          Its existence was already confirmed before this renders. */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: environmentObjectPosition(environment.position) }} />
      <div className="absolute inset-0 bg-black" style={{ opacity: environment.overlay }} />
    </div>
  );
}

export default function PageWallpaper() {
  const backdrop = usePageBackdrop();

  if (!backdrop) {
    return null;
  }

  return backdrop.kind === "wallpaper" ? (
    <UploadedWallpaper wallpaper={backdrop.wallpaper} />
  ) : (
    <DomainEnvironment environment={backdrop.environment} src={backdrop.src} />
  );
}
