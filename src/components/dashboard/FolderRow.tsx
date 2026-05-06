"use client";

import React, { useState } from "react";
import { Folder, Star, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FolderRecord, TeamMember, ColumnConfig } from "@/lib/types";

interface FolderRowProps {
  folder: FolderRecord;
  canEdit: boolean;
  isArchiveView: boolean;
  isStarred: boolean;
  isDragOver: boolean;
  isDragging: boolean;
  currentUserId: string | undefined;
  teamMembers: TeamMember[];
  columns: ColumnConfig;
  onNavigate: (folder: FolderRecord) => void;
  onDelete: (folder: FolderRecord) => void;
  onStar: (folderId: string) => void;
  onRestore: (folderId: string) => void;
  onDragStart: (e: React.DragEvent, type: "folder", id: string) => void;
  onDragOver: (e: React.DragEvent, folderId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, folderId: string) => void;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
}

function getOwnerName(
  createdBy: string | null,
  teamMembers: TeamMember[],
  currentUserId: string | undefined
): string {
  if (!createdBy) return "Unknown";
  if (createdBy === currentUserId) return "You";
  const member = teamMembers.find((m) => m.user_id === createdBy);
  if (!member?.users) return "Unknown";
  return member.users.full_name || member.users.email;
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function FolderRow({
  folder,
  canEdit,
  isArchiveView,
  isStarred,
  isDragOver,
  isDragging,
  currentUserId,
  teamMembers,
  columns,
  onNavigate,
  onDelete,
  onStar,
  onRestore,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isSelected,
  onSelect,
}: FolderRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <tr
      draggable
      onDragStart={(e) => onDragStart(e, "folder", folder.id)}
      onDragOver={(e) => onDragOver(e, folder.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, folder.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group cursor-pointer border-b border-slate-100 transition-colors dark:border-navy-800",
        "hover:bg-indigo-50/40 dark:hover:bg-navy-800/50",
        isSelected && "bg-indigo-50/60 dark:bg-indigo-900/20",
        isDragOver && "bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-inset ring-indigo-500",
        isDragging && "opacity-50"
      )}
      onClick={() => onNavigate(folder)}
    >
      {/* Select */}
      <td className="px-5 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(folder.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select folder ${folder.name}`}
          className="app-focus-ring h-4 w-4 rounded border-slate-300 text-indigo-600"
        />
      </td>

      {/* Name */}
      <td className="px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800/60">
            <Folder className="h-5 w-5 fill-indigo-100 stroke-[1.8] dark:fill-indigo-900/50" />
          </div>
          <span className="block min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white" title={folder.name}>
            {folder.name}
          </span>
        </div>
      </td>

      {/* Owner */}
      {columns.owner && (
        <td className="px-4 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
          {getOwnerName(folder.created_by, teamMembers, currentUserId)}
        </td>
      )}

      {/* Last Modified */}
      {columns.lastModified && (
        <td className="px-4 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
          {formatTimeAgo(folder.created_at)}
        </td>
      )}

      {/* Size */}
      {columns.size && (
        <td className="px-4 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
          --
        </td>
      )}

      {/* Actions */}
      <td className="px-5 py-4">
        <div
          className={cn(
            "flex items-center justify-end gap-1 transition-opacity",
            isHovered ? "opacity-100" : "opacity-70"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onStar(folder.id)}
            className={cn(
              "rounded-lg p-2 transition-colors app-focus-ring",
              isStarred
                ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-navy-700 dark:hover:text-slate-300"
            )}
            title={isStarred ? "Unstar" : "Star"}
            aria-label={isStarred ? `Unstar folder ${folder.name}` : `Star folder ${folder.name}`}
          >
            <Star
              className="h-4 w-4"
              fill={isStarred ? "currentColor" : "none"}
            />
          </button>

          {isArchiveView && canEdit && (
            <button
              onClick={() => onRestore(folder.id)}
              className="app-focus-ring rounded-lg p-2 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
              title="Restore"
              aria-label={`Restore folder ${folder.name}`}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => onDelete(folder)}
              className="app-focus-ring rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title="Delete"
              aria-label={`Delete folder ${folder.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
