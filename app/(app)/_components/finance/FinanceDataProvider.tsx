"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildClassificationContext, type ClassificationContext } from "../../_lib/finance/analytics";
import { ensureDefaultCategories, FinanceRepositoryError, loadFinanceSnapshot, type FinanceSnapshot } from "../../_lib/finance/repository/finance-repository";
import type { FinanceAccount, FinanceCategory } from "../../_lib/finance/types";
import { getSupabaseBrowserClient } from "../../_lib/supabase/client";

// One load of the user's finance data, shared by every Finance tab. All
// writes go through mutate(), which runs the repository call and then
// reloads, so every chart and table always reflects what is stored.

export type FinanceNotice = Readonly<{ kind: "success" | "error"; text: string }>;

type FinanceDataValue = Readonly<{
  userId: string;
  snapshot: FinanceSnapshot | null;
  status: "loading" | "ready" | "error" | "setup-required";
  error: string | null;
  reload: () => Promise<void>;
  mutate: (action: (client: SupabaseClient, userId: string) => Promise<unknown>, successText?: string) => Promise<boolean>;
  notice: FinanceNotice | null;
  showNotice: (notice: FinanceNotice | null) => void;
  context: ClassificationContext;
  accountsById: ReadonlyMap<string, FinanceAccount>;
  categoriesById: ReadonlyMap<string, FinanceCategory>;
}>;

const FinanceDataContext = createContext<FinanceDataValue | null>(null);

// Missing table / unknown relation: the migration has not been applied.
const SETUP_ERROR_CODES = new Set(["42P01", "PGRST205", "PGRST204"]);

function isSetupError(error: unknown): boolean {
  const cause = error instanceof FinanceRepositoryError ? (error.cause as { code?: string } | undefined) : undefined;
  return Boolean(cause?.code && SETUP_ERROR_CODES.has(cause.code));
}

export function FinanceDataProvider({ userId, children }: Readonly<{ userId: string; children: React.ReactNode }>) {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [status, setStatus] = useState<FinanceDataValue["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<FinanceNotice | null>(null);
  const seededRef = useRef(false);

  const reload = useCallback(async () => {
    const client = getSupabaseBrowserClient();

    try {
      if (!seededRef.current) {
        await ensureDefaultCategories(client, userId);
        seededRef.current = true;
      }
      setSnapshot(await loadFinanceSnapshot(client, userId));
      setStatus("ready");
      setError(null);
    } catch (caught) {
      setStatus(isSetupError(caught) ? "setup-required" : "error");
      setError(caught instanceof Error ? caught.message : "Finance data could not be loaded.");
    }
  }, [userId]);

  useEffect(() => {
    // Initial load only; reload() is also exposed for after mutations.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const mutate = useCallback(
    async (action: (client: SupabaseClient, userId: string) => Promise<unknown>, successText?: string) => {
      try {
        await action(getSupabaseBrowserClient(), userId);
        if (successText) setNotice({ kind: "success", text: successText });
        await reload();
        return true;
      } catch (caught) {
        setNotice({ kind: "error", text: caught instanceof Error ? caught.message : "That change could not be saved." });
        await reload();
        return false;
      }
    },
    [reload, userId],
  );

  const value = useMemo<FinanceDataValue>(() => {
    const categories = snapshot?.categories ?? [];
    return {
      userId,
      snapshot,
      status,
      error,
      reload,
      mutate,
      notice,
      showNotice: setNotice,
      context: buildClassificationContext(categories, snapshot?.links ?? []),
      accountsById: new Map((snapshot?.accounts ?? []).map((account) => [account.id, account])),
      categoriesById: new Map(categories.map((category) => [category.id, category])),
    };
  }, [error, mutate, notice, reload, snapshot, status, userId]);

  return <FinanceDataContext.Provider value={value}>{children}</FinanceDataContext.Provider>;
}

export function useFinanceData(): FinanceDataValue {
  const value = useContext(FinanceDataContext);
  if (!value) throw new Error("useFinanceData must be used inside FinanceDataProvider");
  return value;
}

// For components that only render once data is ready.
export function useFinanceSnapshot(): FinanceSnapshot {
  const { snapshot } = useFinanceData();
  if (!snapshot) throw new Error("Finance snapshot requested before it loaded");
  return snapshot;
}
