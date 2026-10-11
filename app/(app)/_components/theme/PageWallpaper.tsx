"use client";

import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import { usePageWallpaper } from "../../_lib/hooks/usePageWallpaper";

// The page's own picture, behind everything.
//
// Rendered INSIDE ThemeBackground's single fixed layer rather than as a
// new wrapper, for the reason documented there: a wrapper would put
// another stacking/scroll container between the shell and pages that own
// their own drag contexts.
//
// It sits ABOVE the ambient wash on purpose. That wash ends in an opaque
// dark gradient, so a picture behind it would simply never be seen.
export default function PageWallpaper() {
  const wallpaper = usePageWallpaper();
  const url = useDocumentPhotoUrl(wallpaper?.id);

  // No picture for this page, or its bytes are not on this device -
  // pictures live in the browser they were uploaded in, same as every
  // other attachment. Rendering nothing is the honest answer; a broken
  // image frame behind the whole app would not be.
  if (!wallpaper || !url) {
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
          // The blur is pushed outwards so the softened edge never shows
          // as a pale border around the viewport.
          filter: wallpaper.blur > 0 ? `blur(${wallpaper.blur}px)` : undefined,
          transform: wallpaper.blur > 0 ? `scale(${1 + wallpaper.blur / 100})` : undefined,
        }}
      />

      {/* The readability guard. Atlas text is white, so the picture is
          knocked back towards black by the amount the user chose. */}
      <div className="absolute inset-0 bg-black" style={{ opacity: wallpaper.dim }} />
    </div>
  );
}
