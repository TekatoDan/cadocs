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
        "hover:bg-slate-50 dark:hover:bg-navy-800/50",
        isDragOver && "bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-inset ring-indigo-500",
        isDragging && "opacity-50"
      )}
      onClick={() => onNavigate(folder)}
    >
      {/* Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Folder className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
            {folder.name}
          </span>
        </div>
      </td>

      {/* Owner */}
      {columns.owner && (
        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
          {getOwnerName(folder.created_by, teamMembers, currentUserId)}
        </td>
      )}

      {/* Last Modified */}
      {columns.lastModified && (
        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
          {formatTimeAgo(folder.created_at)}
        </td>
      )}

      {/* Size */}
      {columns.size && (
        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
          --
        </td>
      )}

      {/* Actions */}
      <td className="px-4 py-3">
        <div
          className={cn(
            "flex items-center justify-end gap-1 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onStar(folder.id)}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              isStarred
                ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-navy-700 dark:hover:text-slate-300"
            )}
            title={isStarred ? "Unstar" : "Star"}
          >
            <Star
              className="h-4 w-4"
              fill={isStarred ? "currentColor" : "none"}
            />
          </button>

          {isArchiveView && canEdit && (
            <button
              onClick={() => onRestore(folder.id)}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
              title="Restore"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => onDelete(folder)}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
