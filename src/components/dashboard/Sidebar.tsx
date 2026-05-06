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
          border-r border-slate-200/80 bg-white/95 shadow-[12px_0_40px_rgba(15,23,42,0.05)] backdrop-blur-xl
          transition-all duration-300 ease-in-out dark:border-slate-800/70 dark:bg-navy-900/95
          md:relative md:z-auto
          ${isSidebarCollapsed ? "w-[4.75rem]" : "w-72"}
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Logo header */}
        <div className="flex h-20 items-center gap-3 border-b border-slate-200/70 px-4 dark:border-slate-800/70">
          <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-navy-800 dark:ring-navy-700">
            <Image
              src="/logo.png"
              alt="CADOcs"
              width={38}
              height={38}
              className="rounded-xl object-contain"
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
            <div className="min-w-0">
              <span className="block truncate font-heading text-xl font-bold text-slate-950 dark:text-white">
                CADocs
              </span>
              <span className="block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Document Management
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {showActionButtons && (
          <div className="px-4 py-4">
            <button
              onClick={() => {
                onShowUpload();
              }}
              title="Upload files"
              className={`
                app-focus-ring flex w-full items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600
                font-semibold text-white shadow-[0_12px_24px_rgba(79,70,229,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(79,70,229,0.28)]
                ${isSidebarCollapsed ? "justify-center p-3" : "px-4 py-3"}
              `}
            >
              <Upload className="w-4 h-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span>Upload</span>}
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
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
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all app-focus-ring ${
              isAtRoot
                ? "border border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-800/60 dark:bg-indigo-900/30 dark:text-indigo-300"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-navy-800 dark:hover:text-white"
            }
              ${
                dragOverFolderId === null && !isAtRoot
                  ? "ring-2 ring-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20"
                  : ""
              }
            `}
          >
            <Folder className="h-4 w-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span>My Files</span>}
          </button>

          {/* Folder tree under My Files */}
          {!isSidebarCollapsed && teamId && (
            <div
              className="ml-3 border-l border-slate-200/80 pl-3 dark:border-navy-700/70"
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
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all app-focus-ring ${
              activeSection === "recent"
                ? "border border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-800/60 dark:bg-indigo-900/30 dark:text-indigo-300"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-navy-800 dark:hover:text-white"
            }`}
          >
            <Clock className="w-4 h-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Recent</span>}
          </button>

          {/* Starred */}
          <button
            onClick={handleStarred}
            title={isSidebarCollapsed ? "Starred" : undefined}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all app-focus-ring ${
              activeSection === "starred"
                ? "border border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-800/60 dark:bg-indigo-900/30 dark:text-indigo-300"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-navy-800 dark:hover:text-white"
            }`}
          >
            <Star className="w-4 h-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Starred</span>}
          </button>

          {/* Trash */}
          <button
            onClick={handleArchive}
            title={isSidebarCollapsed ? "Trash" : undefined}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all app-focus-ring ${
              activeSection === "archive"
                ? "border border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-800/60 dark:bg-indigo-900/30 dark:text-indigo-300"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-navy-800 dark:hover:text-white"
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
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all app-focus-ring ${
                activeSection === "admin"
                  ? "border border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-800/60 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-navy-800 dark:hover:text-white"
              }`}
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span>Team Management</span>}
            </button>
          )}
        </nav>

        {/* User card */}
        <div className="mt-auto border-t border-slate-200/70 p-3 dark:border-slate-800/70">
          <div className="group flex items-center gap-3 rounded-2xl border border-transparent px-2 py-2.5 transition-all hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm dark:hover:border-navy-700 dark:hover:bg-navy-800">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-xs font-bold text-white shadow-sm">
              {avatarText}
            </div>
            {!isSidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {userEmail?.split("@")[0] ?? "User"}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {userEmail ?? ""}
                  </p>
                </div>
                <button
                  onClick={onShowPersonalInfo}
                  className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-indigo-50 hover:text-indigo-500 group-hover:opacity-100 dark:hover:bg-indigo-900/20"
                  aria-label="Personal info"
                  title="Personal info"
                >
                  <UserRoundCog className="w-4 h-4" />
                </button>
                <button
                  onClick={onSignOut}
                  className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20"
                  aria-label="Sign out"
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
            h-7 w-7 items-center justify-center
            rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800
            text-slate-400 shadow-md transition-all hover:scale-110 hover:text-indigo-600 dark:hover:text-slate-300
          `}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
