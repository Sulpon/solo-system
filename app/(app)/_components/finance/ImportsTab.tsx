"use client";

import { useRef, useState } from "react";
import { deleteImport, uploadStatement, type CsvFormOptions } from "../../_lib/finance/api-client";
import type { ImportPreview } from "../../_lib/finance/import-preview";
import { loadImportPreview } from "../../_lib/finance/repository/finance-repository";
import type { StatementImport } from "../../_lib/finance/types";
import { getSupabaseBrowserClient } from "../../_lib/supabase/client";
import Card from "../Card";
import Modal from "../Modal";
import { useFinanceData, useFinanceSnapshot } from "./FinanceDataProvider";
import { Badge, buttonClass, dangerButtonClass, EmptyState, formatBytes, inputClass, primaryButtonClass, SectionHeading } from "./FinanceUi";
import ImportReview from "./ImportReview";

// Upload -> server parses -> review -> commit. Files are processed one at
// a time; each can be cancelled while uploading or reviewed later.

const MAX_BYTES = 4 * 1024 * 1024;

type QueueStatus = "queued" | "uploading" | "processing" | "ready" | "failed" | "cancelled";

type QueueItem = {
  id: string;
  file: File;
  status: QueueStatus;
  progress: number;
  message: string | null;
  importRecord: StatementImport | null;
  preview: ImportPreview | null;
  controller: AbortController;
};

const STATUS_TEXT: Readonly<Record<QueueStatus, string>> = {
  queued: "Waiting",
  uploading: "Uploading",
  processing: "Reading statement",
  ready: "Ready to review",
  failed: "Failed",
  cancelled: "Cancelled",
};

const IMPORT_STATUS: Readonly<Record<StatementImport["status"], { label: string; tone: "purple" | "emerald" | "rose" }>> = {
  needs_review: { label: "Awaiting review", tone: "purple" },
  committed: { label: "Imported", tone: "emerald" },
  failed: { label: "Failed", tone: "rose" },
};

function clientCheck(file: File): string | null {
  const extension = file.name.toLowerCase().split(".").pop();
  if (extension !== "pdf" && extension !== "csv") return "Only PDF statements and CSV files can be imported.";
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_BYTES) return "The file is larger than 4 MB.";
  return null;
}

export default function ImportsTab() {
  const snapshot = useFinanceSnapshot();
  const { reload, showNotice, userId } = useFinanceData();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [csv, setCsv] = useState<CsvFormOptions>({ currency: "EUR", dateOrder: "dmy", accountName: "" });
  const [reviewing, setReviewing] = useState<{ importId: string; fileName: string; preview: ImportPreview } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StatementImport | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const runningRef = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);

  const update = (id: string, patch: Partial<QueueItem>) => {
    queueRef.current = queueRef.current.map((item) => (item.id === id ? { ...item, ...patch } : item));
    setQueue(queueRef.current);
  };

  const processQueue = async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    for (;;) {
      const next = queueRef.current.find((item) => item.status === "queued");
      if (!next) break;

      update(next.id, { status: "uploading", progress: 0 });
      const result = await uploadStatement(next.file, csv, (fraction) => update(next.id, { progress: fraction, status: fraction >= 1 ? "processing" : "uploading" }), next.controller.signal);

      if (result.ok) {
        update(next.id, { status: "ready", progress: 1, importRecord: result.importRecord, preview: result.preview, message: result.alreadyExisted ? "This file was uploaded before; continuing its review." : null });
      } else if (result.error.code === "cancelled") {
        update(next.id, { status: "cancelled", message: null });
      } else {
        update(next.id, { status: "failed", message: result.error.message, importRecord: result.importRecord });
      }
      await reload();
    }

    runningRef.current = false;
  };

  const addFiles = (files: FileList | File[]) => {
    const items: QueueItem[] = [...files].map((file) => {
      const problem = clientCheck(file);
      return {
        id: crypto.randomUUID(),
        file,
        status: problem ? "failed" : "queued",
        progress: 0,
        message: problem,
        importRecord: null,
        preview: null,
        controller: new AbortController(),
      };
    });
    queueRef.current = [...queueRef.current, ...items];
    setQueue(queueRef.current);
    void processQueue();
  };

  const cancelItem = async (item: QueueItem) => {
    if (item.status === "queued") {
      update(item.id, { status: "cancelled" });
      return;
    }
    if (item.status === "uploading" || item.status === "processing") {
      item.controller.abort();
      return;
    }
    if (item.status === "ready" && item.importRecord) {
      const result = await deleteImport(item.importRecord.id);
      if (!result.ok) {
        showNotice({ kind: "error", text: result.error.message });
        return;
      }
      update(item.id, { status: "cancelled", message: "Import cancelled. Nothing was saved." });
      await reload();
    }
  };

  const openReview = async (importRecord: StatementImport, preview: ImportPreview | null) => {
    const loaded = preview ?? (await loadImportPreview(getSupabaseBrowserClient(), userId, importRecord.id).catch(() => null));
    if (!loaded) {
      showNotice({ kind: "error", text: "This import's preview could not be loaded. Cancel it and upload the file again." });
      return;
    }
    setReviewing({ importId: importRecord.id, fileName: importRecord.fileName, preview: loaded });
  };

  const removeImport = async (record: StatementImport) => {
    const result = await deleteImport(record.id);
    setConfirmDelete(null);
    if (!result.ok) {
      showNotice({ kind: "error", text: result.error.message });
      return;
    }
    showNotice({ kind: "success", text: record.status === "committed" ? `Statement deleted with its ${result.value.deletedTransactions} transactions.` : "Import removed." });
    await reload();
  };

  const transactionsFor = (importId: string) => snapshot.transactions.filter((transaction) => transaction.importId === importId).length;
  const hasCsvQueued = queue.some((item) => item.file.name.toLowerCase().endsWith(".csv") && item.status === "queued");

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionHeading title="Import statements" detail="Revolut and Alatau City Bank PDFs are read automatically. Any other bank: export a CSV. Files are stored privately and parsed on the server; nothing is sent to an AI service." />
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop statement files here or choose files"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
          }}
          className={
            "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition " +
            (dragging ? "border-cyan-400/70 bg-cyan-500/10" : "border-slate-700 hover:border-purple-400/60 hover:bg-purple-500/5")
          }
        >
          <p className="text-base font-semibold text-white">Drop PDF or CSV statements here</p>
          <p className="mt-1 text-sm text-slate-400">or click to choose files · several at once · up to 4 MB each</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.csv,application/pdf,text/csv"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        <details className="mt-4 rounded-xl border border-slate-800 p-3 text-sm text-slate-300" open={hasCsvQueued}>
          <summary className="cursor-pointer text-slate-300">CSV options</summary>
          <p className="mt-2 text-xs text-slate-500">
            Needs a header row with date and description columns, plus either a signed amount column or debit and credit columns. Optional: currency, merchant, reference, balance.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <label>
              Currency (if no column)
              <input className={inputClass + " mt-1 uppercase"} maxLength={3} value={csv.currency} onChange={(event) => setCsv({ ...csv, currency: event.target.value.toUpperCase() })} />
            </label>
            <label>
              Date format
              <select className={inputClass + " mt-1"} value={csv.dateOrder} onChange={(event) => setCsv({ ...csv, dateOrder: event.target.value as CsvFormOptions["dateOrder"] })}>
                <option value="dmy">Day / month / year</option>
                <option value="mdy">Month / day / year</option>
                <option value="ymd">Year-month-day</option>
              </select>
            </label>
            <label>
              Account name
              <input className={inputClass + " mt-1"} placeholder="From the file name" value={csv.accountName} maxLength={120} onChange={(event) => setCsv({ ...csv, accountName: event.target.value })} />
            </label>
          </div>
        </details>

        {queue.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {queue.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{item.file.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatBytes(item.file.size)} · {STATUS_TEXT[item.status]}
                      {item.status === "uploading" ? ` ${Math.round(item.progress * 100)}%` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {item.status === "ready" && item.importRecord && item.importRecord.status === "needs_review" ? (
                      <button type="button" className={primaryButtonClass} onClick={() => void openReview(item.importRecord!, item.preview)}>
                        Review
                      </button>
                    ) : null}
                    {item.status === "queued" || item.status === "uploading" || item.status === "processing" || (item.status === "ready" && item.importRecord?.status === "needs_review") ? (
                      <button type="button" className={buttonClass} onClick={() => void cancelItem(item)}>
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
                {item.status === "uploading" || item.status === "processing" ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className={"h-full rounded-full bg-cyan-400 transition-[width] " + (item.status === "processing" ? "animate-pulse" : "")} style={{ width: `${Math.max(4, item.progress * 100)}%` }} />
                  </div>
                ) : null}
                {item.message ? <p className={"mt-2 text-sm " + (item.status === "failed" ? "text-rose-300" : "text-slate-400")}>{item.message}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card className="p-5">
        <SectionHeading title="Imported statements" />
        <div className="mt-4">
          {snapshot.imports.length === 0 ? (
            <EmptyState text="No statements imported yet." />
          ) : (
            <ul className="divide-y divide-slate-800">
              {snapshot.imports.map((record) => {
                const status = IMPORT_STATUS[record.status];
                return (
                  <li key={record.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{record.fileName}</p>
                      <p className="text-xs text-slate-500">
                        {record.bank ?? record.fileType.toUpperCase()} · {formatBytes(record.fileSize)} · uploaded {record.createdAt.slice(0, 10)}
                        {record.status === "committed" ? ` · ${transactionsFor(record.id)} transactions` : ""}
                      </p>
                      {record.errorMessage ? <p className="mt-1 text-xs text-rose-300">{record.errorMessage}</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={status.tone}>{status.label}</Badge>
                      {record.status === "needs_review" ? (
                        <button type="button" className={primaryButtonClass} onClick={() => void openReview(record, null)}>
                          Review
                        </button>
                      ) : null}
                      <button type="button" className={record.status === "committed" ? dangerButtonClass : buttonClass} onClick={() => (record.status === "committed" ? setConfirmDelete(record) : void removeImport(record))}>
                        {record.status === "needs_review" ? "Cancel" : "Delete"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      {reviewing ? <ImportReview importId={reviewing.importId} fileName={reviewing.fileName} preview={reviewing.preview} onClose={() => setReviewing(null)} /> : null}

      {confirmDelete ? (
        <Modal title="Delete statement" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-slate-300">
            Delete <strong>{confirmDelete.fileName}</strong> and the {transactionsFor(confirmDelete.id)} transactions it imported? Categories you set on them are lost. This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={buttonClass} onClick={() => setConfirmDelete(null)}>
              Keep it
            </button>
            <button type="button" className={dangerButtonClass} onClick={() => void removeImport(confirmDelete)}>
              Delete statement and transactions
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
