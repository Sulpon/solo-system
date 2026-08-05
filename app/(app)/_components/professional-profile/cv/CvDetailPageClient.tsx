"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "../../Card";
import EditableStringList from "../../EditableStringList";
import ProfileReferencePicker from "../ProfileReferencePicker";
import { useCvEntries } from "../../../_lib/hooks/useCvEntries";
import { useEducationEntries } from "../../../_lib/hooks/useEducationEntries";
import { useExperienceEntries } from "../../../_lib/hooks/useExperienceEntries";
import { useSkillEntries } from "../../../_lib/hooks/useSkillEntries";
import { createCvDocumentId } from "../../../_lib/types/cv";
import type { CvEntry } from "../../../_lib/types/cv";
import { deleteDocumentFile, getDocumentFile, putDocumentFile } from "../../../_lib/document-store";

type CvDetailPageClientProps = Readonly<{ cvId: string }>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";
const sectionLabelClass = "text-xs font-semibold uppercase tracking-[0.22em] text-purple-300";

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CvDetailPageClient({ cvId }: CvDetailPageClientProps) {
  const router = useRouter();
  const { entries, setEntries, hasLoaded } = useCvEntries();
  const { entries: educationEntries, hasLoaded: educationLoaded } = useEducationEntries();
  const { entries: experienceEntries, hasLoaded: experienceLoaded } = useExperienceEntries();
  const { entries: skillEntries, hasLoaded: skillsLoaded } = useSkillEntries();
  const [documentError, setDocumentError] = useState("");

  if (!hasLoaded || !educationLoaded || !experienceLoaded || !skillsLoaded) {
    return null;
  }

  const entry = entries.find((cv) => cv.id === cvId);

  if (!entry) {
    return (
      <Card className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <p className={sectionLabelClass}>CV Not Found</p>
        <h1 className="mt-3 text-2xl font-black text-white">This CV no longer exists</h1>
        <p className="mt-3 text-sm text-slate-400">It may have been deleted. Head back to your CV list to pick another one.</p>
        <Link
          href="/career-hub/professional-profile/cv"
          className="mt-5 inline-block rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
        >
          ← Back to CVs
        </Link>
      </Card>
    );
  }

  const documents = entry.documents;

  function update(patch: Partial<CvEntry>) {
    setEntries((current) => current.map((cv) => (cv.id === cvId ? { ...cv, ...patch } : cv)));
  }

  async function deleteCv() {
    await Promise.all(documents.map((doc) => deleteDocumentFile(doc.id)));
    setEntries((current) => current.filter((cv) => cv.id !== cvId));
    router.push("/career-hub/professional-profile/cv");
  }

  async function uploadDocuments(fileList: FileList | null, inputElement: HTMLInputElement) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    setDocumentError("");

    try {
      const uploaded = await Promise.all(
        Array.from(fileList).map(async (file) => {
          const id = createCvDocumentId();
          await putDocumentFile(id, file);
          return { id, fileName: file.name, fileType: file.type, fileSize: file.size, uploadedAt: new Date().toISOString() };
        }),
      );

      update({ documents: [...documents, ...uploaded] });
    } catch {
      setDocumentError("Couldn't save one or more files. Please try again.");
    } finally {
      inputElement.value = "";
    }
  }

  async function downloadDocument(doc: CvEntry["documents"][number]) {
    setDocumentError("");
    const file = await getDocumentFile(doc.id);

    if (!file) {
      setDocumentError(`"${doc.fileName}" isn't available on this device - files are only stored in the browser they were uploaded in.`);
      return;
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = doc.fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function deleteDocument(documentId: string) {
    await deleteDocumentFile(documentId);
    update({ documents: documents.filter((doc) => doc.id !== documentId) });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <Link
          href="/career-hub/professional-profile/cv"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-purple-300"
        >
          ← CV Versions
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className={sectionLabelClass}>CV</p>
            <input
              value={entry.name}
              onChange={(event) => update({ name: event.target.value })}
              className="mt-2 w-full max-w-xl rounded-lg border border-transparent bg-transparent px-1 text-3xl font-black text-white outline-none transition focus:border-purple-400 focus:bg-slate-950/70"
              placeholder="CV Name"
            />
          </div>
          <button
            type="button"
            onClick={deleteCv}
            className="shrink-0 rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
          >
            Delete CV
          </button>
        </div>
      </div>

      <Card className="p-5">
        <p className={sectionLabelClass}>Basic Information</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Target Market</span>
            <input value={entry.targetMarket} onChange={(event) => update({ targetMarket: event.target.value })} className={inputClass} placeholder="Netherlands, graduate roles" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Last Updated</span>
            <input type="date" value={entry.lastUpdated} onChange={(event) => update({ lastUpdated: event.target.value })} className={inputClass} />
          </label>
          <div className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Target Roles</span>
            <EditableStringList items={entry.targetRoles} onChange={(next) => update({ targetRoles: next })} placeholder="Add a target role" />
          </div>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Notes</span>
            <textarea value={entry.notes} onChange={(event) => update({ notes: event.target.value })} className={inputClass + " min-h-24"} />
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={sectionLabelClass}>Documents</p>
            <p className="mt-2 text-sm text-slate-400">Files are stored in this browser only - they won&apos;t appear on other devices or in the cloud backup.</p>
          </div>
          <label className="shrink-0 cursor-pointer rounded-xl border border-dashed border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:border-emerald-400/50 hover:text-emerald-200">
            + Upload Document
            <input type="file" multiple onChange={(event) => uploadDocuments(event.target.files, event.target)} className="hidden" />
          </label>
        </div>

        {documentError ? <p className="mt-3 text-sm text-rose-300">{documentError}</p> : null}

        {entry.documents.length > 0 ? (
          <div className="mt-4 space-y-2">
            {entry.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{doc.fileName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatFileSize(doc.fileSize)} · Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => downloadDocument(doc)}
                    className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-purple-400/60 hover:text-white"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteDocument(doc.id)}
                    className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-rose-300 transition hover:border-rose-400/60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No documents uploaded yet.</p>
        )}
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Profile Database References</p>
        <p className="mt-2 text-sm text-slate-400">What this CV variant leads with - pulled live from the Profile Database, never duplicated here.</p>
        <div className="mt-4 space-y-5">
          <ProfileReferencePicker
            label="Education"
            items={educationEntries.map((education) => ({ id: education.id, title: education.degree, subtitle: education.institution }))}
            selectedIds={entry.includedEducationIds}
            onChange={(next) => update({ includedEducationIds: next })}
            emptyMessage="Add an entry in the Profile Database first, then include it here."
          />
          <ProfileReferencePicker
            label="Experience"
            items={experienceEntries.map((experience) => ({ id: experience.id, title: experience.title }))}
            selectedIds={entry.includedExperienceIds}
            onChange={(next) => update({ includedExperienceIds: next })}
            emptyMessage="Add an entry in the Profile Database first, then include it here."
          />
          <ProfileReferencePicker
            label="Skills"
            items={skillEntries.map((skill) => ({ id: skill.id, title: skill.name, subtitle: skill.category }))}
            selectedIds={entry.includedSkillIds}
            onChange={(next) => update({ includedSkillIds: next })}
            emptyMessage="Add an entry in the Profile Database first, then include it here."
          />
        </div>
      </Card>
    </div>
  );
}
