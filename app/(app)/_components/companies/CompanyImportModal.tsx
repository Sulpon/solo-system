"use client";

import { useMemo, useState } from "react";
import Modal from "../Modal";

type CompanyImportModalProps = Readonly<{
  existingNames: ReadonlyArray<string>;
  onCancel: () => void;
  onImport: (names: string[]) => void;
}>;

// Tolerates a plain list (one company per line - the common case when
// copying a single column out of Excel/Sheets) as well as a raw CSV row by
// only taking the first cell of each line.
function parseLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => (line.split(",")[0] ?? "").replace(/^"|"$/g, "").trim())
    .filter((name) => name.length > 0);
}

export default function CompanyImportModal({ existingNames, onCancel, onImport }: CompanyImportModalProps) {
  const [text, setText] = useState("");
  const [skipFirstLine, setSkipFirstLine] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const existingLower = useMemo(() => new Set(existingNames.map((name) => name.toLowerCase())), [existingNames]);

  const { newNames, duplicateCount } = useMemo(() => {
    const lines = parseLines(text);
    const effectiveLines = skipFirstLine ? lines.slice(1) : lines;
    const seen = new Set<string>();
    const unique: string[] = [];
    let duplicates = 0;

    for (const name of effectiveLines) {
      const lower = name.toLowerCase();

      if (existingLower.has(lower) || seen.has(lower)) {
        duplicates += 1;
        continue;
      }

      seen.add(lower);
      unique.push(name);
    }

    return { newNames: unique, duplicateCount: duplicates };
  }, [text, skipFirstLine, existingLower]);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setText(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(file);
    event.target.value = "";
  }

  function handleImport() {
    if (newNames.length === 0) {
      return;
    }

    onImport(newNames);
  }

  return (
    <Modal title="Import Companies" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Paste a list of company names (one per line - copy a single column straight out of Excel or Sheets), or upload a .csv/.txt export. Only the Company Name field is filled in;
          everything else stays empty until you research it.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">
            Upload File
            <input type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
          </label>
          {fileName ? <span className="text-sm text-slate-500">{fileName}</span> : null}
          <label className="ml-auto flex items-center gap-2 text-sm text-slate-400">
            <input type="checkbox" checked={skipFirstLine} onChange={(event) => setSkipFirstLine(event.target.checked)} className="h-4 w-4 rounded border-slate-700 bg-slate-950/70" />
            First line is a header row
          </label>
        </div>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={"DSM-Firmenich\nShell\nAkzoNobel\n..."}
          className="min-h-48 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400"
        />

        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-300">
          <span className="font-semibold text-white">{newNames.length}</span> new compan{newNames.length === 1 ? "y" : "ies"} ready to import
          {duplicateCount > 0 ? <span className="text-slate-500"> · {duplicateCount} skipped (already in your database)</span> : null}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={newNames.length === 0}
          className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Import {newNames.length > 0 ? newNames.length : ""} Compan{newNames.length === 1 ? "y" : "ies"}
        </button>
      </div>
    </Modal>
  );
}
