"use client";

import React, { useState, useRef, useCallback } from "react";
import { UploadCloud, X, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadDocument } from "@/hooks/use-files";
import { extractTextFromFile } from "@/lib/parser";

interface UploadPanelProps {
  teamId: string;
  currentFolderId: string | null;
  onClose: () => void;
}

const ACCEPTED_FILE_TYPES = ".pdf,.txt,.md,.csv,.png,.jpg,.jpeg";

export function UploadPanel({
  teamId,
  currentFolderId,
  onClose,
}: UploadPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isPrivateUpload, setIsPrivateUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadDocument();

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadStatus("Preparing upload...");

      try {
        let extractedText: string | undefined;

        try {
          setUploadStatus("Extracting text from file...");
          extractedText = await extractTextFromFile(file);
        } catch {
          // Text extraction is optional; continue without it
          extractedText = undefined;
        }

        setUploadStatus("Uploading file...");
        await uploadMutation.mutateAsync({
          file,
          teamId,
          folderId: currentFolderId,
          isPrivate: isPrivateUpload,
          extractedText,
        });

        setUploadStatus("Upload complete!");
        setTimeout(() => {
          setUploading(false);
          setUploadStatus("");
        }, 1500);
      } catch {
        setUploadStatus("Upload failed. Please try again.");
        setTimeout(() => {
          setUploading(false);
          setUploadStatus("");
        }, 2000);
      }
    },
    [teamId, currentFolderId, isPrivateUpload, uploadMutation]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
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

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  return (
    <div className="flex h-full flex-col border-l border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-900">
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
      <div className="flex-1 p-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={cn(
            "flex h-80 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors",
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
                {uploadStatus}
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
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileChange}
          className="hidden"
        />
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
