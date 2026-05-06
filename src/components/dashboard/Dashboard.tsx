"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDefaultTeam, useTeamRole, useTeamMembers } from "@/hooks/use-teams";
import { useFiles, useRecentFiles, useStarredFiles, useMoveDocument } from "@/hooks/use-files";
import { useFolders, useStarredFolders, useMoveFolder, useGetArchiveFolder } from "@/hooks/use-folders";
import { useSearchDocuments } from "@/hooks/use-search";
import { Loader2, LogOut, Clock, Sparkles, Star } from "lucide-react";
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
import { PersonalInfoModal } from "./PersonalInfoModal";
import { AdminPanel } from "@/components/admin/AdminPanel";
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
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
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
    tags: "",
    fileSize: "any",
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

  useEffect(() => {
    setSelectedIds([]);
  }, [viewMode, currentFolderId, searchQuery, searchFilters]);

  // Columns
  const [columns, setColumns] = useState<ColumnConfig>({
    owner: true,
    lastModified: true,
    size: true,
  });
  const [sortBy, setSortBy] = useState<"name" | "owner" | "lastModified" | "size">("lastModified");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
    Object.values(searchFilters).some(
      (v) => v !== "all" && v !== "any" && v !== "anyone" && v !== ""
    );

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
  const sortedFiles = useMemo(() => {
    const arr = [...displayFiles];
    arr.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortBy === "name") return a.name.localeCompare(b.name) * direction;
      if (sortBy === "size") return (a.size_bytes - b.size_bytes) * direction;
      if (sortBy === "lastModified") {
        return (
          (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction
        );
      }
      const ownerA =
        teamMembers.find((m) => m.user_id === a.created_by)?.users?.full_name ??
        teamMembers.find((m) => m.user_id === a.created_by)?.users?.email ??
        "";
      const ownerB =
        teamMembers.find((m) => m.user_id === b.created_by)?.users?.full_name ??
        teamMembers.find((m) => m.user_id === b.created_by)?.users?.email ??
        "";
      return ownerA.localeCompare(ownerB) * direction;
    });
    return arr;
  }, [displayFiles, sortBy, sortDirection, teamMembers]);
  const sortedFolders = useMemo(() => {
    const arr = [...displayFolders];
    arr.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortBy === "name") return a.name.localeCompare(b.name) * direction;
      if (sortBy === "lastModified") {
        return (
          (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction
        );
      }
      if (sortBy === "owner") {
        const ownerA =
          teamMembers.find((m) => m.user_id === a.created_by)?.users?.full_name ??
          teamMembers.find((m) => m.user_id === a.created_by)?.users?.email ??
          "";
        const ownerB =
          teamMembers.find((m) => m.user_id === b.created_by)?.users?.full_name ??
          teamMembers.find((m) => m.user_id === b.created_by)?.users?.email ??
          "";
        return ownerA.localeCompare(ownerB) * direction;
      }
      return 0;
    });
    return arr;
  }, [displayFolders, sortBy, sortDirection, teamMembers]);

  const title = showAdminPanel
    ? "Team Management"
    : viewMode === "archive"
      ? "Trash"
      : viewMode === "recent"
        ? "Recent"
        : viewMode === "starred"
          ? "Starred"
          : "My Files";
  const activeSection = showAdminPanel ? "admin" : viewMode;

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
      const params = new URLSearchParams({ path: storagePath });
      const response = await fetch(`/api/files/download?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to download file.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.alert(
        error instanceof Error ? error.message : "Unable to download file."
      );
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

  const quickAccessFiles = useMemo(() => {
    if (viewMode === "recent") return recentFiles.slice(0, 5);
    if (viewMode === "starred") return starredFilesList.slice(0, 5);
    return files.slice(0, 5);
  }, [files, recentFiles, starredFilesList, viewMode]);

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
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] font-sans text-slate-800 dark:bg-slate-950 dark:text-slate-200">
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
        onShowPersonalInfo={() => setShowPersonalInfoModal(true)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        activeSection={activeSection}
      />

      {/* Main Content */}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col bg-[#F8FAFC] dark:bg-navy-950">
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

        <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] p-4 dark:bg-transparent md:p-6">
          {showAdminPanel ? (
            <AdminPanel
              teamId={teamId!}
              currentUserRole={userRole ?? null}
              currentUserId={user?.id}
            />
          ) : (
            <div className="mx-auto max-w-7xl animate-fade-up space-y-5">
              <QuickAccessSection
                files={quickAccessFiles}
                onOpenFile={setPreviewFile}
              />

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
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
                  files={sortedFiles}
                  folders={sortedFolders}
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
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSortChange={(column) => {
                    if (sortBy === column) {
                      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                      return;
                    }
                    setSortBy(column);
                    setSortDirection(column === "name" || column === "owner" ? "asc" : "desc");
                  }}
                  selectedIds={selectedIds}
                  onSelectedIdsChange={setSelectedIds}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal / Drawer */}
      {showUploadPanel && canEdit && !isSpecialView && teamId && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/50 backdrop-blur-sm">
          <button
            aria-label="Close upload drawer backdrop"
            className="h-full w-full cursor-default"
            onClick={() => setShowUploadPanel(false)}
          />
          <div className="relative h-full w-full max-w-xl app-surface animate-slide-in-right rounded-none md:rounded-l-2xl">
            <UploadPanel
              teamId={teamId}
              currentFolderId={currentFolderId}
              onClose={() => setShowUploadPanel(false)}
              variant="drawer"
            />
          </div>
        </div>
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

      <PersonalInfoModal
        open={showPersonalInfoModal}
        onClose={() => setShowPersonalInfoModal(false)}
      />
    </div>
  );
}

function QuickAccessSection({
  files,
  onOpenFile,
}: {
  files: UploadedFileRecord[];
  onOpenFile: (file: UploadedFileRecord) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-navy-700/70 dark:bg-navy-900/80">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800/60">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-[180px]">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Quick Access
          </h2>
          {files.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Star files or folders to access them quickly here.
            </p>
          )}
        </div>
        {files.length === 0 ? (
          <div className="ml-auto flex min-w-0 items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-navy-700 dark:bg-navy-800/50 dark:text-slate-400">
            <Star className="h-4 w-4" aria-hidden="true" />
            <span>No quick access files yet</span>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {files.map((file) => (
              <button
                key={file.id}
                className="app-focus-ring inline-flex max-w-[220px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 hover:shadow-md dark:border-navy-700 dark:bg-navy-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
                onClick={() => onOpenFile(file)}
              >
                <Star className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                <span className="truncate">{file.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
