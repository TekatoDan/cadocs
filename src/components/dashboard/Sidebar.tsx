"use client";

import React from "react";
import Image from "next/image";
import {
  Upload,
  Folder,
  Clock,
  Star,
  Trash2,
  Shield,
  LogOut,
  UserRoundCog,
  ChevronRight,
} from "lucide-react";
import { FolderRecord } from "@/lib/types";
import { SidebarFolderTree } from "@/components/ui/SidebarFolderTree";

interface SidebarProps {
  teamId: string | null;
  userRole: string | null;
  currentFolderId: string | null;
  folderPath: { id: string; name: string }[];
  showAdminPanel: boolean;
  isSidebarCollapsed: boolean;
  isMobileMenuOpen: boolean;
  refreshTrigger: number;
  canEdit: boolean;
  userEmail: string | undefined;
  dragOverFolderId: string | null;
  onNavigateUp: (index: number) => void;
  onNavigateFolder: (folder: FolderRecord, path?: FolderRecord[]) => void;
  onLoadRecent: () => void;
  onLoadStarred: () => void;
  onLoadArchive: () => void;
  onShowAdmin: () => void;
  onShowUpload: () => void;
  onShowNewFolder: () => void;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
  onSignOut: () => void;
  onShowPersonalInfo: () => void;
  onDragOver: (e: React.DragEvent, folderId: string | null) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, folderId: string | null) => void;
  activeSection: "files" | "recent" | "starred" | "archive" | "admin";
}

export default function Sidebar({
  teamId,
  userRole,
  currentFolderId,
  folderPath,
  showAdminPanel,
  isSidebarCollapsed,
  isMobileMenuOpen,
  refreshTrigger,
  canEdit,
  userEmail,
  dragOverFolderId,
  onNavigateUp,
  onNavigateFolder,
  onLoadRecent,
  onLoadStarred,
  onLoadArchive,
  onShowAdmin,
  onShowUpload,
  onShowNewFolder,
  onToggleCollapse,
  onMobileClose,
  onSignOut,
  onShowPersonalInfo,
  onDragOver,
  onDragLeave,
  onDrop,
  activeSection,
}: SidebarProps) {
  const [rootContextMenu, setRootContextMenu] = React.useState<null | { x: number; y: number }>(
    null
  );
  const rootContextMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!rootContextMenu) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootContextMenuRef.current && !rootContextMenuRef.current.contains(target)) {
        setRootContextMenu(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRootContextMenu(null);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [rootContextMenu]);

  const avatarText = userEmail ? userEmail.slice(0, 2).toUpperCase() : "??";

  const isAtRoot = currentFolderId === null && activeSection === "files";

  function handleMyFiles() {
    onNavigateUp(-1);
  }

  function handleRecent() {
    onLoadRecent();
  }

  function handleStarred() {
    onLoadStarred();
  }

  function handleArchive() {
    onLoadArchive();
  }

  function handleAdmin() {
    onShowAdmin();
  }

  function handleFolderNavigate(folder: FolderRecord, path: FolderRecord[]) {
    onNavigateFolder(folder, path);
  }

  const showActionButtons =
    canEdit && activeSection === "files";

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          bg-white/95 dark:bg-navy-900/95 backdrop-blur-xl
          border-r border-slate-200/50 dark:border-slate-800/50
          transition-all duration-300 ease-in-out
          md:relative md:z-auto
          ${isSidebarCollapsed ? "w-16" : "w-60"}
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Logo header */}
        <div className="flex items-center h-16 px-4 gap-3 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="CADOcs"
              width={32}
              height={32}
              className="rounded-lg"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const fallback = target.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div
              className="absolute inset-0 hidden items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
          </div>
          {!isSidebarCollapsed && (
            <span className="text-lg font-bold text-slate-900 dark:text-white truncate">
              CADOcs
            </span>
          )}
        </div>

        {/* Action buttons */}
        {showActionButtons && (
          <div className="px-4 py-3 space-y-2">
            <button
              onClick={() => {
                onShowUpload();
              }}
              title="Upload files"
              className={`
                flex items-center gap-2 w-full rounded-lg bg-indigo-600 hover:bg-indigo-700
                app-focus-ring text-white font-medium transition-colors
                ${isSidebarCollapsed ? "justify-center p-2.5" : "px-4 py-2.5"}
              `}
            >
              <Upload className="w-4 h-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span>Upload</span>}
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {/* My Files */}
          <button
            onClick={handleMyFiles}
            title={isSidebarCollapsed ? "My Files" : undefined}
            onDragOver={(e) => onDragOver(e, null)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, null)}
            onContextMenu={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              e.stopPropagation();
              onNavigateUp(-1);

              // This is handled by the same context menu used for folders.
              // We trigger it by calling `onShowNewFolder` / `onShowUpload` from the menu.
              // (The root menu UI is rendered below.)
              // Keep it near the cursor, but clamp to the viewport bounds.
              const x = Math.min(window.innerWidth - 240, Math.max(0, e.clientX));
              const y = Math.min(window.innerHeight - 160, Math.max(0, e.clientY));
              setRootContextMenu({ x, y });
            }}
            className={`app-nav-item ${
              isAtRoot ? "app-nav-item-active" : "app-nav-item-idle"
            }
              ${
                dragOverFolderId === null && !isAtRoot
                  ? "ring-2 ring-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20"
                  : ""
              }
            `}
          >
            <Folder className="w-4 h-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span>My Files</span>}
          </button>

          {/* Folder tree under My Files */}
          {!isSidebarCollapsed && teamId && (
            <div
              className="pl-3"
              onContextMenu={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                e.stopPropagation();

                // Selecting "root" ensures create/upload actions target the My Files parent.
                onNavigateUp(-1);

                const x = Math.min(window.innerWidth - 240, Math.max(0, e.clientX));
                const y = Math.min(window.innerHeight - 160, Math.max(0, e.clientY));
                setRootContextMenu({ x, y });
              }}
            >
              <SidebarFolderTree
                teamId={teamId}
                currentFolderId={currentFolderId}
                onNavigate={handleFolderNavigate}
                refreshTrigger={refreshTrigger}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                dragOverFolderId={dragOverFolderId}
                onShowNewFolder={canEdit ? onShowNewFolder : undefined}
                onShowUpload={canEdit ? onShowUpload : undefined}
              />
            </div>
          )}

          {/* Recent */}
          <button
            onClick={handleRecent}
            title={isSidebarCollapsed ? "Recent" : undefined}
            className={`app-nav-item ${
              activeSection === "recent" ? "app-nav-item-active" : "app-nav-item-idle"
            }`}
          >
            <Clock className="w-4 h-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Recent</span>}
          </button>

          {/* Starred */}
          <button
            onClick={handleStarred}
            title={isSidebarCollapsed ? "Starred" : undefined}
            className={`app-nav-item ${
              activeSection === "starred" ? "app-nav-item-active" : "app-nav-item-idle"
            }`}
          >
            <Star className="w-4 h-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Starred</span>}
          </button>

          {/* Trash */}
          <button
            onClick={handleArchive}
            title={isSidebarCollapsed ? "Trash" : undefined}
            className={`app-nav-item ${
              activeSection === "archive" ? "app-nav-item-active" : "app-nav-item-idle"
            }`}
          >
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Trash</span>}
          </button>

          {/* Team Management - only for owner/admin */}
          {(userRole === "owner" || userRole === "admin") && (
            <button
              onClick={handleAdmin}
              title={isSidebarCollapsed ? "Team Management" : undefined}
              className={`app-nav-item ${
                activeSection === "admin" ? "app-nav-item-active" : "app-nav-item-idle"
              }`}
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span>Team Management</span>}
            </button>
          )}
        </nav>

        {/* User card */}
        <div className="mt-auto border-t border-slate-200/50 dark:border-slate-800/50 p-3">
          <div className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {avatarText}
            </div>
            {!isSidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {userEmail?.split("@")[0] ?? "User"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {userEmail ?? ""}
                  </p>
                </div>
                <button
                  onClick={onShowPersonalInfo}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                  title="Personal info"
                >
                  <UserRoundCog className="w-4 h-4" />
                </button>
                <button
                  onClick={onSignOut}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className={`
            hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2
            w-6 h-6 items-center justify-center
            rounded-full bg-white dark:bg-slate-800
            border border-slate-200 dark:border-slate-700
            text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
            shadow-sm transition-all hover:scale-110
          `}
        >
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform ${isSidebarCollapsed ? "" : "rotate-180"}`}
          />
        </button>
      </aside>

      {/* Root (My Files) context menu */}
      {rootContextMenu && !isMobileMenuOpen && (
        <div
          style={{ position: "fixed", left: rootContextMenu.x, top: rootContextMenu.y, zIndex: 200 }}
          ref={rootContextMenuRef}
          className="min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-navy-800 dark:bg-navy-950"
          role="menu"
        >
          <button
            onClick={() => {
              setRootContextMenu(null);
              onShowNewFolder();
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-navy-900"
            role="menuitem"
          >
            New Folder
          </button>
          <button
            onClick={() => {
              setRootContextMenu(null);
              onShowUpload();
            }}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-navy-900"
            role="menuitem"
          >
            New File
          </button>
        </div>
      )}
    </>
  );
}
