"use client";

import React, { useState, useRef, useCallback } from "react";
import { UploadCloud, X, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadDocument } from "@/hooks/use-files";

interface UploadPanelProps {
  teamId: string;
  currentFolderId: string | null;
  onClose: () => void;
  variant?: "panel" | "drawer";
}

const ACCEPTED_FILE_TYPES = ".pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.pptx,.png,.jpg,.jpeg";
const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
type UploadQueueStatus =
  | "queued"
  | "uploaded"
  | "uploading"
  | "scanning_content"
  | "ocr_processing"
  | "indexed"
  | "failed_to_extract_text"
  | "error";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${Math.ceil(bytes / (1024 * 1024))} MB`;
}

export function UploadPanel({
  teamId,
  currentFolderId,
  onClose,
  variant = "panel",
}: UploadPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isPrivateUpload, setIsPrivateUpload] = useState(false);
  const [queue, setQueue] = useState<
    {
      id: string;
      name: string;
      status: UploadQueueStatus;
      message?: string;
    }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadDocument();

  const handleUpload = useCallback(
    async (files: File[]) => {
      const uploadItems = files.map((file, index) => {
        const isTooLarge = file.size > MAX_UPLOAD_SIZE_BYTES;
        return {
          file,
          id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
          isTooLarge,
        };
      });
      const initialQueue = uploadItems.map(({ file, id, isTooLarge }) => ({
        id,
        name: file.name,
        status: isTooLarge ? ("error" as const) : ("queued" as const),
        message: isTooLarge
          ? `File is ${formatFileSize(file.size)}. Uploads are limited to ${formatFileSize(
              MAX_UPLOAD_SIZE_BYTES
            )}.`
          : undefined,
      }));
      const uploadableItems = uploadItems.filter((item) => !item.isTooLarge);

      setQueue(initialQueue);
      if (uploadableItems.length === 0) return;

      setUploading(true);

      try {
        for (const { file, id: queueId } of uploadableItems) {
          try {
            setQueue((prev) =>
              prev.map((item) =>
                item.id === queueId ? { ...item, status: "uploading" } : item
              )
            );
            await uploadMutation.mutateAsync({
              file,
              teamId,
              folderId: currentFolderId,
              isPrivate: isPrivateUpload,
              onIndexingStatus: (status, message) => {
                setQueue((prev) =>
                  prev.map((item) =>
                    item.id === queueId
                      ? {
                          ...item,
                          status,
                          message:
                            status === "failed_to_extract_text"
                              ? message || "Text extraction failed."
                              : item.message,
                        }
                      : item
                  )
                );
              },
            });
            setQueue((prev) =>
              prev.map((item) =>
                item.id === queueId && item.status !== "failed_to_extract_text"
                  ? { ...item, status: "indexed" }
                  : item
              )
            );
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Upload failed. Please try again.";
            console.error(`Upload failed for ${file.name}:`, error);
            setQueue((prev) =>
              prev.map((item) =>
                item.id === queueId ? { ...item, status: "error", message } : item
              )
            );
          }
        }
      } finally {
        setUploading(false);
      }
    },
    [teamId, currentFolderId, isPrivateUpload, uploadMutation]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      handleUpload(files);
    }
    // Reset input so re-uploading the same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length > 0) {
      handleUpload(files);
    }
  };

  const getStatusLabel = (status: (typeof queue)[number]["status"]) => {
    if (status === "queued") return "Queued";
    if (status === "uploaded") return "Uploaded";
    if (status === "uploading") return "Uploading";
    if (status === "scanning_content") return "Scanning content";
    if (status === "ocr_processing") return "OCR processing";
    if (status === "indexed") return "Indexed";
    if (status === "failed_to_extract_text") return "Failed to extract text";
    return "Failed";
  };

  return (
    <div
      className={`flex h-full flex-col ${
        variant === "panel"
          ? "border-l border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-900"
          : "bg-white dark:bg-navy-900"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-navy-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Upload
        </h2>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-navy-800 dark:hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Drop Zone */}
      <div className="flex-1 space-y-4 overflow-auto p-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={cn(
            "app-focus-ring flex h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-colors",
            isDraggingOver
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
              : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-navy-600 dark:bg-navy-800/50 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/10",
            uploading && "pointer-events-none"
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Processing uploads...
              </p>
            </div>
          ) : (
            <>
              <UploadCloud
                className={cn(
                  "h-10 w-10",
                  isDraggingOver
                    ? "text-indigo-500"
                    : "text-slate-400 dark:text-slate-500"
                )}
              />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                Drag &amp; Drop files here
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                or click to browse
              </p>
              <button
                type="button"
                className={cn(
                  "mt-4 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  "bg-indigo-600 text-white hover:bg-indigo-700"
                )}
              >
                Browse Files
              </button>
            </>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileChange}
          className="hidden"
        />

        {queue.length > 0 && (
          <div className="app-surface-soft max-h-56 overflow-auto p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Upload Queue
            </h3>
            <ul className="space-y-1.5">
              {queue.map((item) => (
                <li key={item.id} className="rounded-lg bg-white px-3 py-2 text-xs dark:bg-navy-900">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-slate-700 dark:text-slate-200">{item.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${
                        item.status === "indexed"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : item.status === "error" ||
                              item.status === "failed_to_extract_text"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      }`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                  {(item.status === "error" ||
                    item.status === "failed_to_extract_text") &&
                    item.message && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-red-600 dark:text-red-300">
                      {item.message}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Private Upload Toggle */}
      <div className="border-t border-slate-200 px-4 py-3 dark:border-navy-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Private Upload
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPrivateUpload}
            onClick={() => setIsPrivateUpload(!isPrivateUpload)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors",
              isPrivateUpload
                ? "bg-indigo-600"
                : "bg-slate-300 dark:bg-navy-600"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform",
                isPrivateUpload ? "translate-x-4" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
