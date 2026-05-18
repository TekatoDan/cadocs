"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { cn } from "@/lib/utils";
import { useUploadDocument } from "@/hooks/use-files";
import type { UploadedFileRecord } from "@/lib/types";

interface PdfMergeModalProps {
  open: boolean;
  files: UploadedFileRecord[];
  teamId: string | null;
  currentFolderId: string | null;
  canUpload: boolean;
  onClose: () => void;
  onUploaded?: () => void;
}

function getPreviewUrl(storagePath: string): string {
  const params = new URLSearchParams({ path: storagePath });
  return `/api/files/preview?${params.toString()}`;
}

function getMergedFileName(files: UploadedFileRecord[]) {
  if (files.length === 0) return "merged.pdf";
  const firstName = files[0].name.replace(/\.pdf$/i, "");
  return `${firstName}-merged.pdf`;
}

export function PdfMergeModal({
  open,
  files,
  teamId,
  currentFolderId,
  canUpload,
  onClose,
  onUploaded,
}: PdfMergeModalProps) {
  const { session } = useAuth();
  const uploadMutation = useUploadDocument();
  const [orderedFiles, setOrderedFiles] = useState<UploadedFileRecord[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [mergedFileName, setMergedFileName] = useState("merged.pdf");

  const activeFile = useMemo(
    () => orderedFiles.find((file) => file.id === activeFileId) ?? orderedFiles[0] ?? null,
    [activeFileId, orderedFiles]
  );

  useEffect(() => {
    if (!open) return;
    setOrderedFiles(files);
    setActiveFileId(files[0]?.id ?? null);
    setMergedFileName(getMergedFileName(files));
    setMergeError(null);
    setUploadSuccess(false);
  }, [files, open]);

  useEffect(() => {
    if (!open || !activeFile) {
      setPreviewUrl(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadPreview() {
      setPreviewLoading(true);
      setPreviewUrl(null);
      setPreviewError(null);

      try {
        const response = await fetch(getPreviewUrl(activeFile.storage_path), {
          cache: "no-store",
          credentials: "include",
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        });

        if (!response.ok) {
          throw new Error("Unable to load PDF preview.");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
          return;
        }
        setPreviewUrl(objectUrl);
      } catch (error) {
        console.error("Failed to load PDF merge preview:", error);
        if (!cancelled) setPreviewError("Preview could not be loaded.");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeFile, open, session?.access_token]);

  const moveFile = useCallback((fileId: string, direction: -1 | 1) => {
    setOrderedFiles((current) => {
      const index = current.findIndex((file) => file.id === fileId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;

      const next = [...current];
      const [file] = next.splice(index, 1);
      next.splice(nextIndex, 0, file);
      return next;
    });
  }, []);

  const getOutputFileName = useCallback(() => {
    const trimmed = mergedFileName.trim();
    if (!trimmed) return "merged.pdf";
    return trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
  }, [mergedFileName]);

  const buildMergedPdfBlob = useCallback(async () => {
      const { PDFDocument } = await import("pdf-lib");
      const mergedPdf = await PDFDocument.create();

      for (const file of orderedFiles) {
        const response = await fetch(getPreviewUrl(file.storage_path), {
          cache: "no-store",
          credentials: "include",
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        });

        if (!response.ok) {
          throw new Error(`Unable to load ${file.name}.`);
        }

        const sourceBytes = await response.arrayBuffer();
        const sourcePdf = await PDFDocument.load(sourceBytes);
        const pageIndices = sourcePdf.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      return new Blob([mergedBytes], { type: "application/pdf" });
  }, [orderedFiles, session?.access_token]);

  const handleDownloadMerged = useCallback(async () => {
    if (orderedFiles.length < 2 || isMerging || uploadMutation.isPending) return;
    setIsMerging(true);
    setMergeError(null);
    setUploadSuccess(false);

    try {
      const blob = await buildMergedPdfBlob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = getOutputFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Failed to merge PDFs:", error);
      setMergeError(error instanceof Error ? error.message : "Unable to merge PDFs.");
    } finally {
      setIsMerging(false);
    }
  }, [
    buildMergedPdfBlob,
    getOutputFileName,
    isMerging,
    orderedFiles.length,
    uploadMutation.isPending,
  ]);

  const handleUploadMerged = useCallback(async () => {
    if (
      orderedFiles.length < 2 ||
      isMerging ||
      uploadMutation.isPending ||
      !teamId ||
      !canUpload
    ) {
      return;
    }

    setIsMerging(true);
    setMergeError(null);
    setUploadSuccess(false);

    try {
      const blob = await buildMergedPdfBlob();
      const mergedFile = new File([blob], getOutputFileName(), {
        type: "application/pdf",
      });

      await uploadMutation.mutateAsync({
        file: mergedFile,
        teamId,
        folderId: currentFolderId,
        isPrivate: false,
      });
      setUploadSuccess(true);
      onUploaded?.();
    } catch (error) {
      console.error("Failed to upload merged PDF:", error);
      setMergeError(
        error instanceof Error ? error.message : "Unable to upload merged PDF."
      );
    } finally {
      setIsMerging(false);
    }
  }, [
    buildMergedPdfBlob,
    canUpload,
    currentFolderId,
    getOutputFileName,
    isMerging,
    onUploaded,
    orderedFiles.length,
    teamId,
    uploadMutation,
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-navy-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-navy-700">
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="h-5 w-5 shrink-0 text-red-500" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white">
                Merge PDFs
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {orderedFiles.length} PDFs selected
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isMerging}
            className="app-focus-ring rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-slate-200"
            title="Close"
            aria-label="Close merge PDF modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50/80 dark:border-navy-700 dark:bg-navy-950/60 md:border-b-0 md:border-r">
            <div className="border-b border-slate-200 p-4 dark:border-navy-700">
              <label
                htmlFor="merged-pdf-name"
                className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                Output name
              </label>
              <input
                id="merged-pdf-name"
                type="text"
                value={mergedFileName}
                onChange={(event) => setMergedFileName(event.target.value)}
                disabled={isMerging}
                className={cn(
                  "mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors",
                  "border-slate-200 bg-white text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
                  "dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                )}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="space-y-2">
                {orderedFiles.map((file, index) => (
                  <div
                    key={file.id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border p-2 transition-colors",
                      activeFile?.id === file.id
                        ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-navy-700 dark:bg-navy-900 dark:hover:border-navy-600",
                      "disabled:opacity-60"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFileId(file.id)}
                      disabled={isMerging}
                      className="app-focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left disabled:opacity-60"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-50 text-xs font-bold text-red-600 dark:bg-red-900/20 dark:text-red-300">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {file.name}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {(file.size_bytes / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </span>
                    </button>
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveFile(file.id, -1);
                        }}
                        disabled={index === 0 || isMerging}
                        className={cn(
                          "rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-navy-800 dark:hover:text-slate-200",
                          "disabled:pointer-events-none disabled:opacity-30"
                        )}
                        title="Move up"
                        aria-label={`Move ${file.name} up`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveFile(file.id, 1);
                        }}
                        disabled={index === orderedFiles.length - 1 || isMerging}
                        className={cn(
                          "rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-navy-800 dark:hover:text-slate-200",
                          "disabled:pointer-events-none disabled:opacity-30"
                        )}
                        title="Move down"
                        aria-label={`Move ${file.name} down`}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col bg-white dark:bg-navy-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-navy-700">
              <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                {activeFile?.name ?? "Preview"}
              </p>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleUploadMerged}
                  disabled={
                    orderedFiles.length < 2 ||
                    isMerging ||
                    uploadMutation.isPending ||
                    !canUpload ||
                    !teamId
                  }
                  className={cn(
                    "app-focus-ring inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                    "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50",
                    "dark:border-indigo-800 dark:bg-navy-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30",
                    "disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                  title={
                    canUpload
                      ? "Upload merged PDF to this folder"
                      : "Open a folder view to upload the merged PDF"
                  }
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Upload
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMerged}
                  disabled={orderedFiles.length < 2 || isMerging || uploadMutation.isPending}
                  className={cn(
                    "app-focus-ring inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors",
                    "hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                >
                  {isMerging ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isMerging ? "Merging..." : "Download"}
                </button>
              </div>
            </div>

            {mergeError && (
              <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {mergeError}
              </div>
            )}
            {uploadSuccess && (
              <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Merged PDF uploaded.
              </div>
            )}

            <div className="min-h-0 flex-1 p-4">
              {previewLoading && (
                <BrandLoader
                  className="h-full min-h-[420px] bg-transparent dark:bg-transparent"
                  label="Loading PDF preview"
                />
              )}
              {!previewLoading && previewError && (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                  <FileText className="h-14 w-14" />
                  <p className="mt-3 text-sm font-medium">{previewError}</p>
                </div>
              )}
              {!previewLoading && !previewError && previewUrl && (
                <iframe
                  src={previewUrl}
                  title={activeFile?.name ?? "PDF preview"}
                  className="h-full min-h-[420px] w-full rounded-xl border border-slate-200 bg-white dark:border-navy-700"
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
