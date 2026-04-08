"use client";

import React, { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewFolderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  isCreating: boolean;
}

export function NewFolderModal({
  open,
  onClose,
  onSubmit,
  isCreating,
}: NewFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFolderName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = folderName.trim();
    if (!trimmed || isCreating) return;
    await onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Create New Folder
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter a name for the new folder.
        </p>

        <div className="mt-4">
          <input
            ref={inputRef}
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Folder name"
            disabled={isCreating}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors",
              "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400",
              "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
              "dark:border-navy-700 dark:bg-navy-950 dark:text-white dark:placeholder-slate-500",
              "dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20",
              "disabled:opacity-50"
            )}
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              "text-slate-700 hover:bg-slate-100",
              "dark:text-slate-300 dark:hover:bg-navy-800",
              "disabled:opacity-50"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!folderName.trim() || isCreating}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
              "bg-indigo-600 hover:bg-indigo-700",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
            {isCreating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
