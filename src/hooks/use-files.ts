"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTeamFiles,
  getRecentFiles,
  getStarredFiles,
  uploadDocument,
  saveDocumentContent,
  deleteDocument,
  archiveDocument,
  restoreDocument,
  updateDocumentName,
  moveDocument,
  getSignedDownloadUrl,
} from "@/app/actions/storage";

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
      extractedText,
    }: {
      file: File;
      teamId: string;
      folderId: string | null;
      isPrivate: boolean;
      extractedText?: string;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("teamId", teamId);
      if (folderId) formData.append("folderId", folderId);
      formData.append("isPrivate", String(isPrivate));

      const record = await uploadDocument(formData);

      if (extractedText) {
        await saveDocumentContent(record.id, extractedText);
      }

      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
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

export function useSignedUrl() {
  return useMutation({
    mutationFn: (storagePath: string) => getSignedDownloadUrl(storagePath),
  });
}
