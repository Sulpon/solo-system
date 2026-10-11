"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import Card from "../Card";
import { usePageThemes } from "../../_lib/hooks/usePageThemes";
import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import { formatFileSize } from "../../_lib/types/attachment";
import { THEMEABLE_PAGES, WALLPAPER_FITS, type Wallpaper, type WallpaperFit } from "../../_lib/types/custom-theme";

// The stored picture, at the settings the page will actually use, so the
// dim and blur sliders are judged against the real thing.
function WallpaperThumb({ wallpaper }: Readonly<{ wallpaper: Wallpaper }>) {
  const url = useDocumentPhotoUrl(wallpaper.id);

  if (!url) {
    return (
      <span className="atlas-muted flex h-14 w-24 shrink-0 items-center justify-center rounded-lg border border-slate-800 text-center text-[0.6rem] leading-tight">
        not on this device
      </span>
    );
  }

  return (
    <span className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-800">
      <span
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${url})`, filter: wallpaper.blur > 0 ? `blur(${Math.min(6, wallpaper.blur / 3)}px)` : undefined }}
      />
      <span className="absolute inset-0 bg-black" style={{ opacity: wallpaper.dim }} />
    </span>
  );
}

// Wallpapers, and which page each one sits behind.
//
// Pictures are stored in IndexedDB like every other attachment, never in
// the synced settings blob - a few megabytes of photo pushed through the
// cloud snapshot on every write would be a real cost for a decoration.
export default function PageWallpapersPanel() {
  const { settings, hasLoaded, uploadWallpaper, updateWallpaper, deleteWallpaper, setPageWallpaper } = usePageThemes();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!hasLoaded) {
    return (
      <Card className="p-5">
        <p className="atlas-muted text-sm">Loading wallpapers...</p>
      </Card>
    );
  }

  async function addFiles(files: ReadonlyArray<File>) {
    const pictures = files.filter((file) => file.type.startsWith("image/"));

    if (pictures.length === 0) {
      setError("That is not a picture. Wallpapers have to be an image file.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      for (const file of pictures) {
        await uploadWallpaper(file);
      }
    } catch {
      setError("That picture could not be stored on this device. Nothing was added.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5" testId="wallpapers">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <ImagePlus aria-hidden className="h-4 w-4" />
              Wallpapers
            </h2>
            <p className="atlas-muted mt-0.5 text-xs">
              A picture behind a whole page. Stored on this device only — like every other file in Atlas, these do not sync.
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              void addFiles([...(event.target.files ?? [])]);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            data-testid="add-wallpaper"
            className="flex items-center gap-1.5 rounded-xl border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:opacity-40"
          >
            <ImagePlus aria-hidden className="h-3.5 w-3.5" />
            {busy ? "Storing…" : "Add picture"}
          </button>
        </div>

        {error ? <p className="mt-3 text-[0.7rem] text-rose-300">{error}</p> : null}

        {settings.wallpapers.length === 0 ? (
          <p className="atlas-muted mt-4 text-xs">No wallpapers yet. Add a picture, then pin it to a page below.</p>
        ) : (
          <ul className="mt-4 space-y-3" data-testid="wallpaper-list">
            {settings.wallpapers.map((wallpaper) => (
              <li key={wallpaper.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 p-3" data-testid={`wallpaper-${wallpaper.id}`}>
                <WallpaperThumb wallpaper={wallpaper} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{wallpaper.fileName}</p>
                  <p className="atlas-muted text-[0.68rem]">{formatFileSize(wallpaper.fileSize)}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <label className="flex items-center gap-2 text-[0.68rem] text-slate-400">
                      Fit
                      <select
                        value={wallpaper.fit}
                        onChange={(event) => updateWallpaper(wallpaper, { fit: event.target.value as WallpaperFit })}
                        aria-label={`Fit for ${wallpaper.fileName}`}
                        className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-[0.68rem] text-white outline-none focus:border-purple-400"
                      >
                        {WALLPAPER_FITS.map((fit) => (
                          <option key={fit} value={fit}>
                            {fit}
                          </option>
                        ))}
                      </select>
                    </label>

                    {/* Dim is the readability control, so it is first and
                        always visible rather than hidden behind an
                        "advanced" toggle. */}
                    <label className="flex items-center gap-2 text-[0.68rem] text-slate-400">
                      Dim
                      <input
                        type="range"
                        min={0}
                        max={95}
                        value={Math.round(wallpaper.dim * 100)}
                        onChange={(event) => updateWallpaper(wallpaper, { dim: Number(event.target.value) / 100 })}
                        aria-label={`Dim for ${wallpaper.fileName}`}
                        data-testid={`wallpaper-dim-${wallpaper.id}`}
                        className="w-24 accent-[rgb(var(--atlas-accent,168_85_247))]"
                      />
                      <span className="w-8 tabular-nums">{Math.round(wallpaper.dim * 100)}%</span>
                    </label>

                    <label className="flex items-center gap-2 text-[0.68rem] text-slate-400">
                      Blur
                      <input
                        type="range"
                        min={0}
                        max={40}
                        value={wallpaper.blur}
                        onChange={(event) => updateWallpaper(wallpaper, { blur: Number(event.target.value) })}
                        aria-label={`Blur for ${wallpaper.fileName}`}
                        className="w-24 accent-[rgb(var(--atlas-accent,168_85_247))]"
                      />
                      <span className="w-8 tabular-nums">{wallpaper.blur}px</span>
                    </label>
                  </div>
                </div>

                {confirmingDelete === wallpaper.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      void deleteWallpaper(wallpaper.id);
                      setConfirmingDelete(null);
                    }}
                    className="rounded-lg border border-rose-400/50 bg-rose-500/15 px-2 py-1 text-[0.68rem] font-semibold text-rose-200"
                  >
                    Delete, unpin pages
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(wallpaper.id)}
                    aria-label={`Delete ${wallpaper.fileName}`}
                    className="rounded p-1 text-rose-400/80 transition hover:text-rose-300"
                  >
                    <Trash2 aria-hidden className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5" testId="page-wallpaper-assignments">
        <h2 className="text-sm font-bold text-white">Wallpaper per page</h2>
        <p className="atlas-muted mt-0.5 text-xs">
          A choice here also covers that page&apos;s sub-pages. Wallpapers and themes are independent — a page can have either, both, or neither.
        </p>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {THEMEABLE_PAGES.map((entry) => (
            <li key={entry.prefix} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs text-white/80">{entry.label}</span>
              <select
                value={settings.routeWallpapers[entry.prefix] ?? ""}
                onChange={(event) => setPageWallpaper(entry.prefix, event.target.value || null)}
                aria-label={`Wallpaper for ${entry.label}`}
                data-testid={`page-wallpaper-${entry.prefix}`}
                disabled={settings.wallpapers.length === 0}
                className="w-40 shrink-0 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-white outline-none transition focus:border-purple-400 disabled:opacity-40"
              >
                <option value="">None</option>
                {settings.wallpapers.map((wallpaper) => (
                  <option key={wallpaper.id} value={wallpaper.id}>
                    {wallpaper.fileName}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
