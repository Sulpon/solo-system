"use client";

import { useEffect, useState } from "react";
import { getDocumentFile } from "../document-store";

// Resolves a document-store photo id to a displayable object URL. Blobs are
// per-browser (see document-store.ts) - returns null (not an error) when the
// blob simply isn't available on this device, same fallback CV documents use.
export function useDocumentPhotoUrl(photoId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoId) {
      setUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    getDocumentFile(photoId).then((blob) => {
      if (cancelled || !blob) {
        return;
      }

      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photoId]);

  return url;
}
