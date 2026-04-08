"use client";

import React from "react";
import { FolderPlus, Upload } from "lucide-react";
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
}

function SkeletonRow({ columns }: { columns: ColumnConfig }) {
  return (
    <tr className="border-b border-slate-100 dark:border-navy-800">
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
}: FileTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-900">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-navy-700 dark:bg-navy-800/50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Name
            </th>
            {columns.owner && (
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Owner
              </th>
            )}
            {columns.lastModified && (
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Last Modified
              </th>
            )}
            {columns.size && (
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Size
              </th>
            )}
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                  1 +
                  (columns.owner ? 1 : 0) +
                  (columns.lastModified ? 1 : 0) +
                  (columns.size ? 1 : 0) +
                  1
                }
              >
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-navy-800">
                    <FolderPlus className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="mt-4 text-sm font-medium text-slate-900 dark:text-white">
                    This folder is empty
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Create a folder or upload files to get started.
                  </p>
                  {canEdit && !isSpecialView && (
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={onCreateFolder}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                          "border border-slate-200 text-slate-700 hover:bg-slate-50",
                          "dark:border-navy-600 dark:text-slate-300 dark:hover:bg-navy-800"
                        )}
                      >
                        <FolderPlus className="h-4 w-4" />
                        Create Folder
                      </button>
                      <button
                        onClick={onTriggerUpload}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
                          "bg-indigo-600 hover:bg-indigo-700"
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
                />
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
