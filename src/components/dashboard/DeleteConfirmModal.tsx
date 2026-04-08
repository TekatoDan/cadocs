"use client";

import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeleteConfirmModalProps {
  itemName: string;
  itemType: "file" | "folder";
  isPermanent: boolean;
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteConfirmModal({
  itemName,
  itemType,
  isPermanent,
  open,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-navy-900">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isPermanent ? "Permanently Delete" : "Move to Trash"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to{" "}
              {isPermanent ? "permanently delete" : "move to trash"} the{" "}
              {itemType}{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                &quot;{itemName}&quot;
              </span>
              ?
            </p>
            {isPermanent && (
              <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                This action cannot be undone. The {itemType} and all its contents
                will be permanently removed.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
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
            onClick={onConfirm}
            disabled={isDeleting}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
              "bg-red-600 hover:bg-red-700",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isDeleting
              ? "Deleting..."
              : isPermanent
                ? "Permanently Delete"
                : "Move to Trash"}
          </button>
        </div>
      </div>
    </div>
  );
}
