"use client";

import React from "react";
import { Building2, ChevronRight, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbNavProps {
  folderPath: { id: string; name: string }[];
  onNavigateUp: (index: number) => void;
  onLoadRecent: () => void;
  onLoadStarred: () => void;
  onLoadArchive: () => void;
  canEdit: boolean;
  draggedItem: { type: "file" | "folder"; id: string } | null;
  dragOverFolderId: string | null;
  onDragOver: (e: React.DragEvent, folderId: string | null) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, folderId: string | null) => void;
}

function getSectionLabel(name: string): string {
  switch (name) {
    case ".archive":
      return "Trash";
    case ".recent":
      return "Recent";
    case ".starred":
      return "Starred";
    default:
      return name;
  }
}

function getRootLabel(folderPath: { id: string; name: string }[]): string {
  if (folderPath.length === 0) return "My Files";
  const rootName = folderPath[0]?.name;
  if (rootName === ".archive") return "Trash";
  if (rootName === ".recent") return "Recent";
  if (rootName === ".starred") return "Starred";
  return "My Files";
}

export function BreadcrumbNav({
  folderPath,
  onNavigateUp,
  onLoadRecent,
  onLoadStarred,
  onLoadArchive,
  canEdit,
  draggedItem,
  dragOverFolderId,
  onDragOver,
  onDragLeave,
  onDrop,
}: BreadcrumbNavProps) {
  const isSpecialSection =
    folderPath.length > 0 &&
    [".archive", ".recent", ".starred"].includes(folderPath[0]?.name);

  const handleRootClick = () => {
    if (isSpecialSection) {
      const rootName = folderPath[0]?.name;
      if (rootName === ".archive") return onLoadArchive();
      if (rootName === ".recent") return onLoadRecent();
      if (rootName === ".starred") return onLoadStarred();
    }
    onNavigateUp(-1);
  };

  const segments = isSpecialSection
    ? folderPath.slice(1)
    : folderPath;

  const rootLabel = getRootLabel(folderPath);
  const isRootActive = segments.length === 0;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 shadow-sm backdrop-blur dark:border-navy-700/70 dark:bg-navy-900/80"
    >
      <button
        type="button"
        onClick={() => onNavigateUp(-1)}
        onDragOver={
          canEdit && draggedItem
            ? (e) => onDragOver(e, null)
            : undefined
        }
        onDragLeave={
          canEdit && draggedItem ? onDragLeave : undefined
        }
        onDrop={
          canEdit && draggedItem
            ? (e) => onDrop(e, null)
            : undefined
        }
        className={cn(
          "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-semibold transition-colors",
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-white",
          "app-focus-ring",
          dragOverFolderId === null &&
            draggedItem &&
            "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
        )}
      >
        <Building2 className="h-4 w-4" />
        CADocs
      </button>

      <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />

      {isSpecialSection && (
        <>
          <button
            type="button"
            onClick={handleRootClick}
            className={cn(
              "rounded-xl px-2.5 py-1.5 text-sm font-medium transition-colors",
              "app-focus-ring",
              isRootActive
                ? "bg-indigo-50 font-bold text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800/70"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-white"
            )}
          >
            {rootLabel}
          </button>
          {segments.length > 0 && (
            <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
          )}
        </>
      )}

      {!isSpecialSection && (
        <>
          <button
            type="button"
            onClick={() => onNavigateUp(-1)}
            onDragOver={
              canEdit && draggedItem
                ? (e) => onDragOver(e, null)
                : undefined
            }
            onDragLeave={
              canEdit && draggedItem ? onDragLeave : undefined
            }
            onDrop={
              canEdit && draggedItem
                ? (e) => onDrop(e, null)
                : undefined
            }
            className={cn(
              "rounded-xl px-2.5 py-1.5 text-sm font-medium transition-colors",
              "app-focus-ring",
              isRootActive
                ? "bg-indigo-50 font-bold text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800/70"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-white",
              dragOverFolderId === null &&
                draggedItem &&
                !isRootActive &&
                "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <Folder className="h-4 w-4" aria-hidden="true" />
              My Files
            </span>
          </button>
          {segments.length > 0 && (
            <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
          )}
        </>
      )}

      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const pathIndex = isSpecialSection ? index + 1 : index;

        return (
          <React.Fragment key={segment.id}>
            <button
              type="button"
              onClick={() => onNavigateUp(pathIndex)}
              onDragOver={
                canEdit && draggedItem
                  ? (e) => onDragOver(e, segment.id)
                  : undefined
              }
              onDragLeave={
                canEdit && draggedItem ? onDragLeave : undefined
              }
              onDrop={
                canEdit && draggedItem
                  ? (e) => onDrop(e, segment.id)
                  : undefined
              }
              className={cn(
                "max-w-[180px] truncate rounded-xl px-2.5 py-1.5 text-sm font-medium transition-colors",
                "app-focus-ring",
                isLast
                  ? "bg-indigo-50 font-bold text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800/70"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-white",
                dragOverFolderId === segment.id &&
                  draggedItem &&
                  "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
              )}
            >
              {getSectionLabel(segment.name)}
            </button>
            {!isLast && (
              <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
