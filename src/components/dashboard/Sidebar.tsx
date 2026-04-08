"use client";

import React from "react";
import Image from "next/image";
import {
  Plus,
  FolderPlus,
  Folder,
  Clock,
  Star,
  Trash2,
  Shield,
  LogOut,
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
  onDragOver: (e: React.DragEvent, folderId: string | null) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, folderId: string | null) => void;
}

type ActiveView = "files" | "recent" | "starred" | "archive";

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
  onDragOver,
  onDragLeave,
  onDrop,
}: SidebarProps) {
  const [activeView, setActiveView] = React.useState<ActiveView>("files");

  const avatarText = userEmail ? userEmail.slice(0, 2).toUpperCase() : "??";

  const isAtRoot = currentFolderId === null && activeView === "files";

  function handleMyFiles() {
    setActiveView("files");
    onNavigateUp(0);
  }

  function handleRecent() {
    setActiveView("recent");
    onLoadRecent();
  }

  function handleStarred() {
    setActiveView("starred");
    onLoadStarred();
  }

  function handleArchive() {
    setActiveView("archive");
    onLoadArchive();
  }

  function handleAdmin() {
    onShowAdmin();
  }

  function handleFolderNavigate(folder: FolderRecord, path: FolderRecord[]) {
    setActiveView("files");
    onNavigateFolder(folder, path);
  }

  const showActionButtons =
    canEdit && activeView === "files";

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
          ${isSidebarCollapsed ? "w-20" : "w-64"}
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
              onClick={onShowUpload}
              className={`
                flex items-center gap-2 w-full rounded-lg bg-indigo-600 hover:bg-indigo-700
                text-white font-medium transition-colors
                ${isSidebarCollapsed ? "justify-center p-2.5" : "px-4 py-2.5"}
              `}
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span>New</span>}
            </button>
            <button
              onClick={onShowNewFolder}
              className={`
                flex items-center gap-2 w-full rounded-lg
                text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800
                font-medium transition-colors
                ${isSidebarCollapsed ? "justify-center p-2.5" : "px-4 py-2.5"}
              `}
            >
              <FolderPlus className="w-4 h-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span>New Folder</span>}
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {/* My Files */}
          <button
            onClick={handleMyFiles}
            onDragOver={(e) => onDragOver(e, null)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, null)}
            className={`
              flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors
              ${
                isAtRoot
                  ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
            <div className="pl-3">
              <SidebarFolderTree
                teamId={teamId}
                currentFolderId={currentFolderId}
                onNavigate={handleFolderNavigate}
                refreshTrigger={refreshTrigger}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                dragOverFolderId={dragOverFolderId}
              />
            </div>
          )}

          {/* Recent */}
          <button
            onClick={handleRecent}
            className={`
              flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors
              ${
                activeView === "recent"
                  ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }
            `}
          >
            <Clock className="w-4 h-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Recent</span>}
          </button>

          {/* Starred */}
          <button
            onClick={handleStarred}
            className={`
              flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors
              ${
                activeView === "starred"
                  ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }
            `}
          >
            <Star className="w-4 h-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Starred</span>}
          </button>

          {/* Trash */}
          <button
            onClick={handleArchive}
            className={`
              flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors
              ${
                activeView === "archive"
                  ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }
            `}
          >
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Trash</span>}
          </button>

          {/* Team Management - only for owner/admin */}
          {(userRole === "owner" || userRole === "admin") && (
            <button
              onClick={handleAdmin}
              className={`
                flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors
                ${
                  showAdminPanel
                    ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }
              `}
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
    </>
  );
}
