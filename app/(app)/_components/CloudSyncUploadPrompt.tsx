"use client";

import Modal from "./Modal";
import { useCloudSync } from "../_lib/hooks/useCloudSync";

export default function CloudSyncUploadPrompt() {
  const { showUploadPrompt, confirmUploadLocalSnapshot, dismissUploadPrompt } = useCloudSync();

  if (!showUploadPrompt) {
    return null;
  }

  return (
    <Modal title="Sync Local Data?" onClose={dismissUploadPrompt}>
      <p className="text-sm text-slate-300">
        No Atlas data was found in your cloud account yet, but this device has local data. Upload it now to start
        syncing across devices?
      </p>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={dismissUploadPrompt}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={() => void confirmUploadLocalSnapshot()}
          className="rounded-xl border border-purple-500/40 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:border-purple-300"
        >
          Upload to Cloud
        </button>
      </div>
    </Modal>
  );
}
