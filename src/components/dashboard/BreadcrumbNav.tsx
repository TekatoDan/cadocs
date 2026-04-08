"use client";

import React from "react";
import { HardDrive, ChevronRight } from "lucide-react";
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
    <div className="flex items-center rounded-full bg-white/50 px-3 py-1.5 dark:bg-navy-800/50">
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
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
          "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
          dragOverFolderId === null &&
            draggedItem &&
            "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
        )}
      >
        <HardDrive className="h-3.5 w-3.5" />
        CADOcs
      </button>

      <ChevronRight className="mx-1 h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />

      {isSpecialSection && (
        <>
          <button
            type="button"
            onClick={handleRootClick}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium transition-colors",
              isRootActive
                ? "bg-white font-bold text-slate-900 shadow-sm dark:bg-navy-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            {rootLabel}
          </button>
          {segments.length > 0 && (
            <ChevronRight className="mx-1 h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
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
              "rounded-md px-2 py-1 text-xs font-medium transition-colors",
              isRootActive
                ? "bg-white font-bold text-slate-900 shadow-sm dark:bg-navy-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              dragOverFolderId === null &&
                draggedItem &&
                !isRootActive &&
                "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
            )}
          >
            My Files
          </button>
          {segments.length > 0 && (
            <ChevronRight className="mx-1 h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
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
                "max-w-[150px] truncate rounded-md px-2 py-1 text-xs font-medium transition-colors",
                isLast
                  ? "bg-white font-bold text-slate-900 shadow-sm dark:bg-navy-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                dragOverFolderId === segment.id &&
                  draggedItem &&
                  "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
              )}
            >
              {getSectionLabel(segment.name)}
            </button>
            {!isLast && (
              <ChevronRight className="mx-1 h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
