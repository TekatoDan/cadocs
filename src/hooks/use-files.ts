"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTeamFiles,
  getRecentFiles,
  getStarredFiles,
  uploadDocument,
  deleteDocument,
  archiveDocument,
  restoreDocument,
  updateDocumentName,
  moveDocument,
  getSignedDownloadUrl,
  reindexDocument,
} from "@/app/actions/storage";

type UploadIndexingStatus =
  | "uploaded"
  | "scanning_content"
  | "ocr_processing"
  | "indexed"
  | "ocr_not_configured"
  | "failed_to_extract_text";

function isImageUpload(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name);
}

export function useFiles(teamId: string | null, folderId: string | null) {
  return useQuery({
    queryKey: ["files", teamId, folderId],
    queryFn: () => getTeamFiles(teamId!, folderId),
    enabled: !!teamId,
  });
}

export function useRecentFiles(teamId: string | null) {
  return useQuery({
    queryKey: ["files", "recent", teamId],
    queryFn: () => getRecentFiles(teamId!),
    enabled: !!teamId,
  });
}

export function useStarredFiles(teamId: string | null, fileIds: string[]) {
  return useQuery({
    queryKey: ["files", "starred", teamId, fileIds],
    queryFn: () => getStarredFiles(teamId!, fileIds),
    enabled: !!teamId && fileIds.length > 0,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      teamId,
      folderId,
      isPrivate,
      onIndexingStatus,
    }: {
      file: File;
      teamId: string;
      folderId: string | null;
      isPrivate: boolean;
      onIndexingStatus?: (status: UploadIndexingStatus, message?: string) => void;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("teamId", teamId);
      if (folderId) formData.append("folderId", folderId);
      formData.append("isPrivate", String(isPrivate));
      formData.append("maxFileNameLength", "80");

      const result = await uploadDocument(formData);
      if (!result.ok) {
        throw new Error(result.error);
      }

      const record = result.file;

      onIndexingStatus?.("uploaded");
      onIndexingStatus?.(isImageUpload(file) ? "ocr_processing" : "scanning_content");
      try {
        const indexResult = await reindexDocument(record.id);
        if (indexResult.ok) {
          onIndexingStatus?.(
            (indexResult.status as UploadIndexingStatus | undefined) ??
              (indexResult.indexed ? "indexed" : "failed_to_extract_text"),
            indexResult.message
          );
        } else {
          onIndexingStatus?.("uploaded", indexResult.error);
          console.warn("File uploaded, but search indexing failed:", indexResult.error);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Search indexing could not be started.";
        onIndexingStatus?.("uploaded", message);
        console.warn("File uploaded, but search indexing could not be started:", error);
      }

      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      fileId,
      storagePath,
    }: {
      fileId: string;
      storagePath: string;
    }) => deleteDocument(fileId, storagePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useArchiveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, teamId }: { fileId: string; teamId: string }) =>
      archiveDocument(fileId, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useRestoreDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => restoreDocument(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useRenameDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, newName }: { fileId: string; newName: string }) =>
      updateDocumentName(fileId, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useMoveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      fileId,
      newFolderId,
    }: {
      fileId: string;
      newFolderId: string | null;
    }) => moveDocument(fileId, newFolderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}

export function useReindexDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => reindexDocument(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
  });
}

export function useSignedUrl() {
  return useMutation({
    mutationFn: (storagePath: string) => getSignedDownloadUrl(storagePath),
  });
}
