"use client";

import React from "react";
import {
  ArrowDownUp,
  ArrowUp,
  ArrowDown,
  FolderPlus,
  Upload,
  Star,
  RotateCcw,
  Trash2,
  X,
  Loader2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderRow } from "@/components/dashboard/FolderRow";
import { FileRow } from "@/components/dashboard/FileRow";
import type {
  FolderRecord,
  UploadedFileRecord,
  TeamMember,
  ColumnConfig,
  StarredItems,
} from "@/lib/types";

interface FileTableProps {
  files: UploadedFileRecord[];
  folders: FolderRecord[];
  isLoading: boolean;
  isEmpty: boolean;
  canEdit: boolean;
  isArchiveView: boolean;
  isSpecialView: boolean;
  currentUserId: string | undefined;
  teamMembers: TeamMember[];
  columns: ColumnConfig;
  starredItems: StarredItems;
  draggedItem: { type: "file" | "folder"; id: string } | null;
  dragOverFolderId: string | null;
  onNavigateFolder: (folder: FolderRecord) => void;
  onPreviewFile: (file: UploadedFileRecord) => void;
  onDownloadFile: (storagePath: string, fileName: string) => void;
  onDeleteFile: (file: UploadedFileRecord) => void;
  onDeleteFolder: (folder: FolderRecord) => void;
  onStarFile: (fileId: string) => void;
  onStarFolder: (folderId: string) => void;
  onRestoreFile: (fileId: string) => void;
  onRestoreFolder: (folderId: string) => void;
  onDragStart: (e: React.DragEvent, type: "file" | "folder", id: string) => void;
  onDragOver: (e: React.DragEvent, folderId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, folderId: string) => void;
  onCreateFolder: () => void;
  onTriggerUpload: () => void;
  sortBy: "name" | "owner" | "lastModified" | "size";
  sortDirection: "asc" | "desc";
  onSortChange: (column: "name" | "owner" | "lastModified" | "size") => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onBulkStar: () => void;
  onMergePdfs: () => void;
  onBulkRestore: () => void;
  onBulkDelete: () => void;
  isBulkActionPending: boolean;
}

function SkeletonRow({ columns }: { columns: ColumnConfig }) {
  return (
    <tr className="border-b border-slate-100 dark:border-navy-800">
      <td className="px-4 py-3">
        <div className="h-4 w-4 animate-pulse rounded bg-slate-200 dark:bg-navy-700" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200 dark:bg-navy-700" />
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-navy-700" />
        </div>
      </td>
      {columns.owner && (
        <td className="px-4 py-3">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-navy-700" />
        </td>
      )}
      {columns.lastModified && (
        <td className="px-4 py-3">
          <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-navy-700" />
        </td>
      )}
      {columns.size && (
        <td className="px-4 py-3">
          <div className="h-4 w-14 animate-pulse rounded bg-slate-200 dark:bg-navy-700" />
        </td>
      )}
      <td className="px-4 py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-navy-700" />
      </td>
    </tr>
  );
}

export function FileTable({
  files,
  folders,
  isLoading,
  isEmpty,
  canEdit,
  isArchiveView,
  isSpecialView,
  currentUserId,
  teamMembers,
  columns,
  starredItems,
  draggedItem,
  dragOverFolderId,
  onNavigateFolder,
  onPreviewFile,
  onDownloadFile,
  onDeleteFile,
  onDeleteFolder,
  onStarFile,
  onStarFolder,
  onRestoreFile,
  onRestoreFolder,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onCreateFolder,
  onTriggerUpload,
  sortBy,
  sortDirection,
  onSortChange,
  selectedIds,
  onSelectedIdsChange,
  onBulkStar,
  onMergePdfs,
  onBulkRestore,
  onBulkDelete,
  isBulkActionPending,
}: FileTableProps) {
  const allIds = React.useMemo(
    () => [...folders.map((folder) => folder.id), ...files.map((file) => file.id)],
    [folders, files]
  );
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const selectedFileCount = files.filter((file) => selectedIds.includes(file.id)).length;
  const selectedFolderCount = folders.filter((folder) => selectedIds.includes(folder.id)).length;
  const selectedPdfCount = files.filter(
    (file) =>
      selectedIds.includes(file.id) &&
      (file.mime_type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))
  ).length;
  const selectedCount = selectedFileCount + selectedFolderCount;
  const canMergeSelectedPdfs =
    selectedPdfCount >= 2 &&
    selectedFolderCount === 0 &&
    selectedPdfCount === selectedFileCount;
  const selectedAreAllStarred =
    selectedCount > 0 &&
    files
      .filter((file) => selectedIds.includes(file.id))
      .every((file) => starredItems.files.includes(file.id)) &&
    folders
      .filter((folder) => selectedIds.includes(folder.id))
      .every((folder) => starredItems.folders.includes(folder.id));

  const toggleSelection = (id: string, checked: boolean) => {
    if (checked) {
      onSelectedIdsChange(Array.from(new Set([...selectedIds, id])));
      return;
    }
    onSelectedIdsChange(selectedIds.filter((item) => item !== id));
  };

  const getSortIcon = (column: "name" | "owner" | "lastModified" | "size") => {
    if (sortBy !== column) return <ArrowDownUp className="h-3.5 w-3.5" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-navy-700/80 dark:bg-navy-900">
      {selectedCount > 0 && (
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-indigo-50/70 px-4 py-3 dark:border-navy-700 dark:bg-indigo-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {selectedCount} selected
            <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              {selectedFileCount} file{selectedFileCount !== 1 ? "s" : ""},{" "}
              {selectedFolderCount} folder{selectedFolderCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBulkStar}
              disabled={isBulkActionPending}
              className={cn(
                "app-focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                "border border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700",
                "dark:border-navy-600 dark:bg-navy-900 dark:text-slate-300 dark:hover:bg-amber-900/20 dark:hover:text-amber-300",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              <Star className="h-3.5 w-3.5" fill={selectedAreAllStarred ? "currentColor" : "none"} />
              {selectedAreAllStarred ? "Unstar" : "Star"}
            </button>
            {selectedPdfCount >= 2 && (
              <button
                type="button"
                onClick={onMergePdfs}
                disabled={!canMergeSelectedPdfs || isBulkActionPending}
                className={cn(
                  "app-focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  "border border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700",
                  "dark:border-navy-600 dark:bg-navy-900 dark:text-slate-300 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-300",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
                title={
                  canMergeSelectedPdfs
                    ? "Merge selected PDFs"
                    : "Select only PDF files to merge"
                }
              >
                <FileText className="h-3.5 w-3.5" />
                Merge PDFs
              </button>
            )}
            {isArchiveView && canEdit && (
              <button
                type="button"
                onClick={onBulkRestore}
                disabled={isBulkActionPending}
                className={cn(
                  "app-focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  "border border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
                  "dark:border-navy-600 dark:bg-navy-900 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={onBulkDelete}
                disabled={isBulkActionPending}
                className={cn(
                  "app-focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  "border border-red-200 bg-white text-red-600 hover:bg-red-50",
                  "dark:border-red-900/60 dark:bg-navy-900 dark:text-red-400 dark:hover:bg-red-900/20",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                {isBulkActionPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {isArchiveView ? "Delete" : "Move to Trash"}
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectedIdsChange([])}
              disabled={isBulkActionPending}
              className={cn(
                "app-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors",
                "hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-slate-200",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
              title="Clear selection"
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] table-fixed">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/90 dark:border-navy-700 dark:bg-navy-800/60">
            <th className="w-12 px-5 py-4 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectedIdsChange(e.target.checked ? allIds : [])}
                aria-label="Select all rows"
                className="app-focus-ring h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
            </th>
            <th className="w-[44%] px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <button
                onClick={() => onSortChange("name")}
                className="app-focus-ring inline-flex items-center gap-1.5 rounded-lg px-1 py-1 transition-colors hover:text-slate-900 dark:hover:text-white"
              >
                Name {getSortIcon("name")}
              </button>
            </th>
            {columns.owner && (
              <th className="w-[12%] px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <button
                  onClick={() => onSortChange("owner")}
                  className="app-focus-ring inline-flex items-center gap-1.5 rounded-lg px-1 py-1 transition-colors hover:text-slate-900 dark:hover:text-white"
                >
                  Owner {getSortIcon("owner")}
                </button>
              </th>
            )}
            {columns.lastModified && (
              <th className="w-[13%] px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <button
                  onClick={() => onSortChange("lastModified")}
                  className="app-focus-ring inline-flex items-center gap-1.5 rounded-lg px-1 py-1 transition-colors hover:text-slate-900 dark:hover:text-white"
                >
                  Last Modified {getSortIcon("lastModified")}
                </button>
              </th>
            )}
            {columns.size && (
              <th className="w-[10%] px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <button
                  onClick={() => onSortChange("size")}
                  className="app-focus-ring inline-flex items-center gap-1.5 rounded-lg px-1 py-1 transition-colors hover:text-slate-900 dark:hover:text-white"
                >
                  Size {getSortIcon("size")}
                </button>
              </th>
            )}
            <th className="w-36 px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <>
              <SkeletonRow columns={columns} />
              <SkeletonRow columns={columns} />
              <SkeletonRow columns={columns} />
              <SkeletonRow columns={columns} />
              <SkeletonRow columns={columns} />
            </>
          ) : isEmpty ? (
            <tr>
              <td
                colSpan={
                  2 +
                  (columns.owner ? 1 : 0) +
                  (columns.lastModified ? 1 : 0) +
                  (columns.size ? 1 : 0) +
                  1
                }
              >
                <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 ring-1 ring-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800/60">
                    <FolderPlus className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                    This folder is empty
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                    Create a folder or upload files to get started.
                  </p>
                  {canEdit && !isSpecialView && (
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={onCreateFolder}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                          "border border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-700 hover:shadow-sm",
                          "dark:border-navy-600 dark:text-slate-300 dark:hover:bg-navy-800"
                        )}
                      >
                        <FolderPlus className="h-4 w-4" />
                        Create Folder
                      </button>
                      <button
                        onClick={onTriggerUpload}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all",
                          "bg-indigo-600 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md"
                        )}
                      >
                        <Upload className="h-4 w-4" />
                        Upload Files
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            <>
              {folders.map((folder) => (
                <FolderRow
                  key={folder.id}
                  folder={folder}
                  canEdit={canEdit}
                  isArchiveView={isArchiveView}
                  isStarred={starredItems.folders.includes(folder.id)}
                  isDragOver={dragOverFolderId === folder.id}
                  isDragging={
                    draggedItem?.type === "folder" &&
                    draggedItem.id === folder.id
                  }
                  currentUserId={currentUserId}
                  teamMembers={teamMembers}
                  columns={columns}
                  onNavigate={onNavigateFolder}
                  onDelete={onDeleteFolder}
                  onStar={onStarFolder}
                  onRestore={onRestoreFolder}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  isSelected={selectedIds.includes(folder.id)}
                  onSelect={toggleSelection}
                />
              ))}
              {files.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  canEdit={canEdit}
                  isArchiveView={isArchiveView}
                  isStarred={starredItems.files.includes(file.id)}
                  isDragging={
                    draggedItem?.type === "file" && draggedItem.id === file.id
                  }
                  currentUserId={currentUserId}
                  teamMembers={teamMembers}
                  columns={columns}
                  onPreview={onPreviewFile}
                  onDownload={onDownloadFile}
                  onDelete={onDeleteFile}
                  onStar={onStarFile}
                  onRestore={onRestoreFile}
                  onDragStart={onDragStart}
                  isSelected={selectedIds.includes(file.id)}
                  onSelect={toggleSelection}
                />
              ))}
            </>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
