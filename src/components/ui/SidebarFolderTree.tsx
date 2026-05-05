"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, ChevronDown, Folder, Loader2 } from "lucide-react";
import { getFolders } from "@/app/actions/storage";
import type { FolderRecord } from "@/lib/types";

interface SidebarFolderTreeProps {
  teamId: string;
  currentFolderId: string | null;
  onNavigate: (folder: FolderRecord, path: FolderRecord[]) => void;
  parentId?: string | null;
  level?: number;
  refreshTrigger?: number;
  path?: FolderRecord[];
  onDragOver?: (e: React.DragEvent, folderId: string) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, folderId: string) => void;
  dragOverFolderId?: string | null;
  onShowNewFolder?: () => void;
  onShowUpload?: () => void;
}

export function SidebarFolderTree({
  teamId,
  currentFolderId,
  onNavigate,
  parentId = null,
  level = 0,
  refreshTrigger = 0,
  path = [],
  onDragOver,
  onDragLeave,
  onDrop,
  dragOverFolderId,
  onShowNewFolder,
  onShowUpload,
}: SidebarFolderTreeProps) {
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [contextMenu, setContextMenu] = useState<
    null | { x: number; y: number; folderName: string; folder: FolderRecord; folderPath: FolderRecord[] }
  >(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadFolders = async () => {
      setIsLoading(true);
      try {
        const fetchedFolders = await getFolders(teamId, parentId);
        if (isMounted) {
          setFolders(fetchedFolders);
          setHasLoaded(true);
        }
      } catch (error) {
        console.error("Failed to load folders:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadFolders();
    return () => {
      isMounted = false;
    };
  }, [teamId, parentId, refreshTrigger]);

  useEffect(() => {
    if (!contextMenu) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (contextMenuRef.current && !contextMenuRef.current.contains(target)) {
        setContextMenu(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [contextMenu]);

  if (isLoading && !hasLoaded) {
    return (
      <div
        className="flex items-center gap-2 py-1 px-3 text-slate-400"
        style={{ paddingLeft: `${(level + 1) * 0.75 + 0.75}rem` }}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (folders.length === 0 && level > 0) return null;

  return (
    <div className="space-y-0.5">
      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          teamId={teamId}
          currentFolderId={currentFolderId}
          onNavigate={onNavigate}
          level={level}
          path={path}
          refreshTrigger={refreshTrigger}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          dragOverFolderId={dragOverFolderId}
          onShowNewFolder={onShowNewFolder}
          onShowUpload={onShowUpload}
          onOpenContextMenu={(x, y, folderName, folder, folderPath) =>
            setContextMenu({ x, y, folderName, folder, folderPath })
          }
        />
      ))}

      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y, zIndex: 200 }}
          className="min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-navy-800 dark:bg-navy-950"
          role="menu"
        >
          {onShowNewFolder && (
            <button
              onClick={() => {
                if (contextMenu) onNavigate(contextMenu.folder, contextMenu.folderPath);
                setContextMenu(null);
                onShowNewFolder();
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-navy-900"
              role="menuitem"
            >
              New Folder
            </button>
          )}
          {onShowUpload && (
            <button
              onClick={() => {
                if (contextMenu) onNavigate(contextMenu.folder, contextMenu.folderPath);
                setContextMenu(null);
                onShowUpload();
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-navy-900 ${
                onShowNewFolder ? "mt-1" : ""
              }`}
              role="menuitem"
            >
              New File
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface FolderItemProps {
  folder: FolderRecord;
  teamId: string;
  currentFolderId: string | null;
  onNavigate: (folder: FolderRecord, path: FolderRecord[]) => void;
  level: number;
  path: FolderRecord[];
  refreshTrigger: number;
  onDragOver?: (e: React.DragEvent, folderId: string) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, folderId: string) => void;
  dragOverFolderId?: string | null;
  onShowNewFolder?: () => void;
  onShowUpload?: () => void;
  onOpenContextMenu: (
    x: number,
    y: number,
    folderName: string,
    folder: FolderRecord,
    folderPath: FolderRecord[]
  ) => void;
}

const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  teamId,
  currentFolderId,
  onNavigate,
  level,
  path,
  refreshTrigger,
  onDragOver,
  onDragLeave,
  onDrop,
  dragOverFolderId,
  onShowNewFolder,
  onShowUpload,
  onOpenContextMenu,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSelected = currentFolderId === folder.id;
  const isDragOver = dragOverFolderId === folder.id;

  const currentPath = [...path, folder] as FolderRecord[];

  return (
    <div className="w-full">
      <div
        className={`flex items-center group cursor-pointer rounded-lg py-1.5 pr-3 transition-colors ${isSelected ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"} ${isDragOver ? "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" : ""}`}
        style={{ paddingLeft: `${level * 0.75 + 0.75}rem` }}
        onDragOver={(e) => onDragOver?.(e, folder.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop?.(e, folder.id)}
        onContextMenu={(e) => {
          if (!onShowNewFolder && !onShowUpload) return;
          e.preventDefault();
          e.stopPropagation();

          // Ensure the selected folder is the correct parent for create/upload actions.
          onNavigate(folder, currentPath);

          const x = Math.min(window.innerWidth - 240, Math.max(0, e.clientX));
          const y = Math.min(window.innerHeight - 160, Math.max(0, e.clientY));
          onOpenContextMenu(x, y, folder.name, folder, currentPath);
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 mr-1 flex-shrink-0"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
        <div
          className="flex items-center gap-2 flex-1 min-w-0"
          onClick={() => onNavigate(folder, currentPath)}
        >
          <Folder
            className={`w-4 h-4 flex-shrink-0 ${isSelected ? "fill-indigo-100 dark:fill-indigo-900/50" : ""}`}
          />
          <span className="text-sm font-medium truncate">{folder.name}</span>
        </div>
      </div>

      {isExpanded && (
        <SidebarFolderTree
          teamId={teamId}
          currentFolderId={currentFolderId}
          onNavigate={onNavigate}
          parentId={folder.id}
          level={level + 1}
          path={currentPath}
          refreshTrigger={refreshTrigger}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          dragOverFolderId={dragOverFolderId}
          onShowNewFolder={onShowNewFolder}
          onShowUpload={onShowUpload}
        />
      )}
    </div>
  );
};
