"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDefaultTeam, useTeamRole, useTeamMembers } from "@/hooks/use-teams";
import { useFiles, useRecentFiles, useStarredFiles, useMoveDocument } from "@/hooks/use-files";
import { useFolders, useStarredFolders, useMoveFolder, useGetArchiveFolder } from "@/hooks/use-folders";
import { useSearchDocuments } from "@/hooks/use-search";
import { Loader2, LogOut, Clock } from "lucide-react";
import type {
  FolderRecord,
  UploadedFileRecord,
  SearchFilters,
  StarredItems,
  ColumnConfig,
} from "@/lib/types";

import Sidebar from "./Sidebar";
import Header from "./Header";
import { BreadcrumbNav } from "./BreadcrumbNav";
import { FileTable } from "./FileTable";
import { UploadPanel } from "./UploadPanel";
import { SearchResults } from "./SearchResults";
import FilePreviewModal from "./FilePreviewModal";
import { NewFolderModal } from "./NewFolderModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { getSignedDownloadUrl } from "@/app/actions/storage";
import { useCreateFolder, useDeleteFolder, useArchiveFolderMutation } from "@/hooks/use-folders";
import { useDeleteDocument, useArchiveDocument, useRestoreDocument } from "@/hooks/use-files";
import { useRestoreFolder } from "@/hooks/use-folders";

type ViewMode = "files" | "recent" | "starred" | "archive";

export default function Dashboard() {
  const { user, signOut } = useAuth();

  // Team data
  const { data: team, isLoading: teamLoading } = useDefaultTeam(user?.id);
  const teamId = team?.id ?? null;
  const { data: userRole } = useTeamRole(teamId, user?.id);
  const { data: teamMembers = [] } = useTeamMembers(teamId);

  // Navigation state
  const [viewMode, setViewMode] = useState<ViewMode>("files");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [refreshSidebar, setRefreshSidebar] = useState(0);

  // UI state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(true);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // File/folder interaction state
  const [previewFile, setPreviewFile] = useState<UploadedFileRecord | null>(null);
  const [fileToDelete, setFileToDelete] = useState<UploadedFileRecord | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderRecord | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    fileType: "all",
    dateModified: "any",
    owner: "anyone",
  });

  // Stars
  const [starredItems, setStarredItems] = useState<StarredItems>(() => {
    if (typeof window === "undefined") return { files: [], folders: [] };
    const saved = localStorage.getItem("starredItems");
    return saved ? JSON.parse(saved) : { files: [], folders: [] };
  });

  useEffect(() => {
    localStorage.setItem("starredItems", JSON.stringify(starredItems));
  }, [starredItems]);

  // Columns
  const [columns, setColumns] = useState<ColumnConfig>({
    owner: true,
    lastModified: true,
    size: true,
  });

  // Drag and drop
  const [draggedItem, setDraggedItem] = useState<{ type: "file" | "folder"; id: string } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Data fetching with TanStack Query
  const { data: files = [], isLoading: filesLoading } = useFiles(
    viewMode === "files" ? teamId : null,
    viewMode === "files" ? currentFolderId : null
  );
  const { data: folders = [], isLoading: foldersLoading } = useFolders(
    viewMode === "files" ? teamId : null,
    viewMode === "files" ? currentFolderId : null
  );
  const { data: recentFiles = [], isLoading: recentLoading } = useRecentFiles(
    viewMode === "recent" ? teamId : null
  );
  const { data: starredFilesList = [] } = useStarredFiles(
    viewMode === "starred" ? teamId : null,
    viewMode === "starred" ? starredItems.files : []
  );
  const { data: starredFoldersList = [] } = useStarredFolders(
    viewMode === "starred" ? teamId : null,
    viewMode === "starred" ? starredItems.folders : []
  );

  // Archive data
  const [archiveFolderId, setArchiveFolderId] = useState<string | null>(null);
  const { data: archiveFiles = [] } = useFiles(
    viewMode === "archive" ? teamId : null,
    archiveFolderId
  );
  const { data: archiveFolders = [] } = useFolders(
    viewMode === "archive" ? teamId : null,
    archiveFolderId
  );

  // Search
  const { data: searchResults = [], isFetching: isSearching } = useSearchDocuments(
    teamId,
    searchQuery,
    searchFilters
  );

  const isSearchActive =
    searchQuery.length >= 3 ||
    Object.values(searchFilters).some((v) => v !== "all" && v !== "any" && v !== "anyone");

  // Mutations
  const createFolderMutation = useCreateFolder();
  const deleteFolderMutation = useDeleteFolder();
  const archiveFolderMutation = useArchiveFolderMutation();
  const restoreFolderMutation = useRestoreFolder();
  const deleteDocumentMutation = useDeleteDocument();
  const archiveDocumentMutation = useArchiveDocument();
  const restoreDocumentMutation = useRestoreDocument();
  const moveDocumentMutation = useMoveDocument();
  const moveFolderMutation = useMoveFolder();
  const getArchiveFolderMutation = useGetArchiveFolder();

  const canEdit = userRole === "owner" || userRole === "admin" || userRole === "member";
  const isArchiveView = viewMode === "archive";
  const isSpecialView = viewMode !== "files";
  const isLoading = viewMode === "files" ? filesLoading || foldersLoading : viewMode === "recent" ? recentLoading : false;

  // Computed display data
  const displayFiles = viewMode === "recent" ? recentFiles : viewMode === "starred" ? starredFilesList : viewMode === "archive" ? archiveFiles : files;
  const displayFolders = viewMode === "starred" ? starredFoldersList : viewMode === "archive" ? archiveFolders : viewMode === "recent" ? [] : folders;

  const title = showAdminPanel
    ? "Team Management"
    : viewMode === "archive"
      ? "Trash"
      : viewMode === "recent"
        ? "Recent"
        : viewMode === "starred"
          ? "Starred"
          : "My Files";

  // Navigation handlers
  const navigateToRoot = useCallback(() => {
    setViewMode("files");
    setCurrentFolderId(null);
    setFolderPath([]);
    setShowAdminPanel(false);
  }, []);

  const navigateToFolder = useCallback(
    (folder: FolderRecord, path?: FolderRecord[]) => {
      setShowAdminPanel(false);
      setViewMode("files");
      setCurrentFolderId(folder.id);
      if (path) {
        setFolderPath(path.map((f) => ({ id: f.id, name: f.name })));
      } else {
        setFolderPath((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].id === folder.id) return prev;
          return [...prev, { id: folder.id, name: folder.name }];
        });
      }
    },
    []
  );

  const navigateUp = useCallback(
    (index: number) => {
      setShowAdminPanel(false);
      if (index === -1) {
        navigateToRoot();
      } else {
        const target = folderPath[index];
        setCurrentFolderId(target.id);
        setFolderPath((prev) => prev.slice(0, index + 1));
      }
    },
    [folderPath, navigateToRoot]
  );

  const loadRecent = useCallback(() => {
    setShowAdminPanel(false);
    setViewMode("recent");
    setFolderPath([{ id: "recent", name: ".recent" }]);
    setCurrentFolderId("recent");
  }, []);

  const loadStarred = useCallback(() => {
    setShowAdminPanel(false);
    setViewMode("starred");
    setFolderPath([{ id: "starred", name: ".starred" }]);
    setCurrentFolderId("starred");
  }, []);

  const loadArchive = useCallback(async () => {
    if (!teamId) return;
    setShowAdminPanel(false);
    try {
      const archive = await getArchiveFolderMutation.mutateAsync(teamId);
      setViewMode("archive");
      setArchiveFolderId(archive.id);
      setFolderPath([{ id: archive.id, name: ".archive" }]);
      setCurrentFolderId(archive.id);
    } catch (err: any) {
      console.error("Failed to open Trash:", err);
    }
  }, [teamId, getArchiveFolderMutation]);

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, type: "file" | "folder", id: string) => {
      if (!canEdit) {
        e.preventDefault();
        return;
      }
      setDraggedItem({ type, id });
      e.dataTransfer.setData("text/plain", `${type}:${id}`);
      e.dataTransfer.effectAllowed = "move";
    },
    [canEdit]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, folderId: string | null) => {
      e.preventDefault();
      if (!canEdit || !draggedItem) return;
      if (draggedItem.type === "folder" && draggedItem.id === folderId) return;
      e.dataTransfer.dropEffect = "move";
      setDragOverFolderId(folderId);
    },
    [canEdit, draggedItem]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolderId(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetFolderId: string | null) => {
      e.preventDefault();
      setDragOverFolderId(null);
      if (!canEdit || !draggedItem || !teamId) return;
      if (draggedItem.type === "folder" && draggedItem.id === targetFolderId) return;
      if (targetFolderId === currentFolderId) return;

      try {
        if (draggedItem.type === "file") {
          await moveDocumentMutation.mutateAsync({
            fileId: draggedItem.id,
            newFolderId: targetFolderId,
          });
        } else {
          await moveFolderMutation.mutateAsync({
            folderId: draggedItem.id,
            newParentId: targetFolderId,
          });
          setRefreshSidebar((prev) => prev + 1);
        }
      } catch (err: any) {
        console.error("Failed to move item:", err);
      } finally {
        setDraggedItem(null);
      }
    },
    [canEdit, draggedItem, teamId, currentFolderId, moveDocumentMutation, moveFolderMutation]
  );

  // Star handlers
  const toggleStarFile = useCallback((fileId: string) => {
    setStarredItems((prev) => ({
      ...prev,
      files: prev.files.includes(fileId)
        ? prev.files.filter((id) => id !== fileId)
        : [...prev.files, fileId],
    }));
  }, []);

  const toggleStarFolder = useCallback((folderId: string) => {
    setStarredItems((prev) => ({
      ...prev,
      folders: prev.folders.includes(folderId)
        ? prev.folders.filter((id) => id !== folderId)
        : [...prev.folders, folderId],
    }));
  }, []);

  // Download handler
  const handleDownload = useCallback(async (storagePath: string, fileName: string) => {
    try {
      const signedUrl = await getSignedDownloadUrl(storagePath);
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download:", err);
    }
  }, []);

  // Delete handlers
  const handleConfirmDelete = useCallback(async () => {
    if (fileToDelete && teamId) {
      try {
        if (isArchiveView) {
          await deleteDocumentMutation.mutateAsync({
            fileId: fileToDelete.id,
            storagePath: fileToDelete.storage_path,
          });
        } else {
          await archiveDocumentMutation.mutateAsync({
            fileId: fileToDelete.id,
            teamId,
          });
        }
        setFileToDelete(null);
      } catch (err) {
        console.error("Failed to delete file:", err);
      }
    }

    if (folderToDelete && teamId) {
      try {
        if (isArchiveView) {
          await deleteFolderMutation.mutateAsync(folderToDelete.id);
        } else {
          await archiveFolderMutation.mutateAsync({
            folderId: folderToDelete.id,
            teamId,
          });
        }
        setRefreshSidebar((prev) => prev + 1);
        setFolderToDelete(null);
      } catch (err) {
        console.error("Failed to delete folder:", err);
      }
    }
  }, [
    fileToDelete,
    folderToDelete,
    teamId,
    isArchiveView,
    deleteDocumentMutation,
    archiveDocumentMutation,
    deleteFolderMutation,
    archiveFolderMutation,
  ]);

  // Create folder handler
  const handleCreateFolder = useCallback(
    async (name: string) => {
      if (!teamId) return;
      await createFolderMutation.mutateAsync({
        teamId,
        name,
        parentId: currentFolderId,
      });
      setRefreshSidebar((prev) => prev + 1);
      setShowNewFolderModal(false);
    },
    [teamId, currentFolderId, createFolderMutation]
  );

  // Restore handlers
  const handleRestoreFile = useCallback(
    async (fileId: string) => {
      await restoreDocumentMutation.mutateAsync(fileId);
    },
    [restoreDocumentMutation]
  );

  const handleRestoreFolder = useCallback(
    async (folderId: string) => {
      await restoreFolderMutation.mutateAsync(folderId);
      setRefreshSidebar((prev) => prev + 1);
    },
    [restoreFolderMutation]
  );

  // Loading state
  if (teamLoading) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  // Viewer role (pending activation)
  if (userRole === "viewer") {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Account Pending Activation
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Your account requires administrator approval before you can access the
            document repository.
          </p>
          <button
            onClick={signOut}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans overflow-hidden">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        teamId={teamId}
        userRole={userRole ?? null}
        currentFolderId={currentFolderId}
        folderPath={folderPath}
        showAdminPanel={showAdminPanel}
        isSidebarCollapsed={isSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        refreshTrigger={refreshSidebar}
        canEdit={canEdit}
        userEmail={user?.email ?? undefined}
        dragOverFolderId={dragOverFolderId}
        onNavigateUp={navigateUp}
        onNavigateFolder={navigateToFolder}
        onLoadRecent={loadRecent}
        onLoadStarred={loadStarred}
        onLoadArchive={loadArchive}
        onShowAdmin={() => setShowAdminPanel(true)}
        onShowUpload={() => {
          setShowUploadPanel(true);
          setIsMobileMenuOpen(false);
        }}
        onShowNewFolder={() => {
          setShowNewFolderModal(true);
          setIsMobileMenuOpen(false);
        }}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onMobileClose={() => setIsMobileMenuOpen(false)}
        onSignOut={signOut}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-navy-950 relative z-10">
        <Header
          title={title}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchFilters={searchFilters}
          onSearchFiltersChange={setSearchFilters}
          isSearching={isSearching}
          columns={columns}
          onColumnsChange={setColumns}
          teamMembers={teamMembers}
          currentUserId={user?.id}
          onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
        />

        <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50 dark:bg-transparent">
          {showAdminPanel ? (
            <AdminPanel
              teamId={teamId!}
              currentUserRole={userRole ?? null}
              currentUserId={user?.id}
            />
          ) : (
            <div className="max-w-7xl mx-auto animate-fade-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <BreadcrumbNav
                  folderPath={folderPath}
                  onNavigateUp={navigateUp}
                  onLoadRecent={loadRecent}
                  onLoadStarred={loadStarred}
                  onLoadArchive={loadArchive}
                  canEdit={canEdit}
                  draggedItem={draggedItem}
                  dragOverFolderId={dragOverFolderId}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
              </div>

              {isSearchActive ? (
                <SearchResults
                  results={searchResults}
                  searchQuery={searchQuery}
                  isSearching={isSearching}
                  teamMembers={teamMembers}
                  currentUserId={user?.id}
                  onPreview={(f) => setPreviewFile(f as UploadedFileRecord)}
                  onDownload={handleDownload}
                />
              ) : (
                <FileTable
                  files={displayFiles}
                  folders={displayFolders}
                  isLoading={isLoading}
                  isEmpty={displayFiles.length === 0 && displayFolders.length === 0}
                  canEdit={canEdit}
                  isArchiveView={isArchiveView}
                  isSpecialView={isSpecialView}
                  currentUserId={user?.id}
                  teamMembers={teamMembers}
                  columns={columns}
                  starredItems={starredItems}
                  draggedItem={draggedItem}
                  dragOverFolderId={dragOverFolderId}
                  onNavigateFolder={navigateToFolder}
                  onPreviewFile={setPreviewFile}
                  onDownloadFile={handleDownload}
                  onDeleteFile={setFileToDelete}
                  onDeleteFolder={setFolderToDelete}
                  onStarFile={toggleStarFile}
                  onStarFolder={toggleStarFolder}
                  onRestoreFile={handleRestoreFile}
                  onRestoreFolder={handleRestoreFolder}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onCreateFolder={() => setShowNewFolderModal(true)}
                  onTriggerUpload={() => setShowUploadPanel(true)}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Upload Panel */}
      {showUploadPanel && canEdit && !isSpecialView && teamId && (
        <UploadPanel
          teamId={teamId}
          currentFolderId={currentFolderId}
          onClose={() => setShowUploadPanel(false)}
        />
      )}

      {/* Modals */}
      <NewFolderModal
        open={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onSubmit={handleCreateFolder}
        isCreating={createFolderMutation.isPending}
      />

      <DeleteConfirmModal
        itemName={fileToDelete?.name || folderToDelete?.name || ""}
        itemType={fileToDelete ? "file" : "folder"}
        isPermanent={isArchiveView}
        open={!!fileToDelete || !!folderToDelete}
        onClose={() => {
          setFileToDelete(null);
          setFolderToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={
          deleteDocumentMutation.isPending ||
          archiveDocumentMutation.isPending ||
          deleteFolderMutation.isPending ||
          archiveFolderMutation.isPending
        }
      />

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />
    </div>
  );
}
