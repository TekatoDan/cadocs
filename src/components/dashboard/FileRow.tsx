"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  FileAudio,
  FileVideo,
  Star,
  Trash2,
  RotateCcw,
  Edit2,
  Download,
  Lock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRenameDocument } from "@/hooks/use-files";
import type { UploadedFileRecord, TeamMember, ColumnConfig } from "@/lib/types";

interface FileRowProps {
  file: UploadedFileRecord;
  canEdit: boolean;
  isArchiveView: boolean;
  isStarred: boolean;
  isDragging: boolean;
  currentUserId: string | undefined;
  teamMembers: TeamMember[];
  columns: ColumnConfig;
  onPreview: (file: UploadedFileRecord) => void;
  onDownload: (storagePath: string, fileName: string) => void;
  onDelete: (file: UploadedFileRecord) => void;
  onStar: (fileId: string) => void;
  onRestore: (fileId: string) => void;
  onDragStart: (e: React.DragEvent, type: "file", id: string) => void;
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

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf")
    return { icon: FileText, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30" };
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext))
    return { icon: ImageIcon, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30" };
  if (["js", "ts", "jsx", "tsx", "py", "rb", "go", "rs", "html", "css", "json"].includes(ext))
    return { icon: FileCode, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" };
  if (["csv", "xls", "xlsx"].includes(ext))
    return { icon: FileSpreadsheet, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" };
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext))
    return { icon: FileArchive, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" };
  if (["mp3", "wav", "ogg", "flac", "aac"].includes(ext))
    return { icon: FileAudio, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" };
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext))
    return { icon: FileVideo, color: "text-pink-500", bg: "bg-pink-100 dark:bg-pink-900/30" };

  return { icon: FileText, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" };
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export function FileRow({
  file,
  canEdit,
  isArchiveView,
  isStarred,
  isDragging,
  currentUserId,
  teamMembers,
  columns,
  onPreview,
  onDownload,
  onDelete,
  onStar,
  onRestore,
  onDragStart,
}: FileRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [editingName, setEditingName] = useState(file.name);
  const [isRenaming, setIsRenaming] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameMutation = useRenameDocument();

  const { icon: FileIcon, color: iconColor, bg: iconBg } = getFileIcon(file.name);
  const isPrivate = file.status === "private";

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  const handleRenameSubmit = async () => {
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === file.name) {
      setIsRenaming(false);
      setEditingName(file.name);
      return;
    }
    try {
      await renameMutation.mutateAsync({ fileId: file.id, newName: trimmed });
    } catch {
      setEditingName(file.name);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
      setEditingName(file.name);
    }
  };

  return (
    <tr
      draggable
      onDragStart={(e) => onDragStart(e, "file", file.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group cursor-pointer border-b border-slate-100 transition-colors dark:border-navy-800",
        "hover:bg-slate-50 dark:hover:bg-navy-800/50",
        isDragging && "opacity-50"
      )}
      onClick={() => !isRenaming && onPreview(file)}
    >
      {/* Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              iconBg
            )}
          >
            <FileIcon className={cn("h-4 w-4", iconColor)} />
          </div>
          <div className="flex items-center gap-2 truncate">
            {isRenaming ? (
              <input
                ref={renameInputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={handleRenameSubmit}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "rounded-md border px-2 py-1 text-sm outline-none",
                  "border-indigo-500 bg-white text-slate-900 ring-2 ring-indigo-500/20",
                  "dark:bg-navy-900 dark:text-white"
                )}
              />
            ) : (
              <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                {file.name}
              </span>
            )}
            {isPrivate && (
              <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            )}
          </div>
        </div>
      </td>

      {/* Owner */}
      {columns.owner && (
        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
          {getOwnerName(file.created_by, teamMembers, currentUserId)}
        </td>
      )}

      {/* Last Modified */}
      {columns.lastModified && (
        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
          {formatTimeAgo(file.created_at)}
        </td>
      )}

      {/* Size */}
      {columns.size && (
        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
          {formatSize(file.size_bytes)}
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
            onClick={() => onStar(file.id)}
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
              onClick={() => onRestore(file.id)}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
              title="Restore"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => {
                setEditingName(file.name);
                setIsRenaming(true);
              }}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-navy-700 dark:hover:text-slate-300"
              title="Rename"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => onDownload(file.storage_path, file.name)}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-navy-700 dark:hover:text-slate-300"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>

          {canEdit && (
            <button
              onClick={() => onDelete(file)}
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
