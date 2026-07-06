"use client";

import { useContext } from "react";
import { CloudSyncContext } from "../cloud-sync-store";

export function useCloudSync() {
  const context = useContext(CloudSyncContext);

  if (!context) {
    throw new Error("useCloudSync must be used within a CloudSyncProvider");
  }

  return context;
}
