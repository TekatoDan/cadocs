"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  finalizeDocumentUpload,
  getTeamFiles,
  getRecentFiles,
  getStarredFiles,
  prepareDocumentUpload,
  saveDocumentContent,
  deleteDocument,
  archiveDocument,
  restoreDocument,
  updateDocumentName,
  moveDocument,
  getSignedDownloadUrl,
  reindexDocument,
} from "@/app/actions/storage";
import { createClient } from "@/lib/supabase/client";

function isOcrCandidate(file: File) {
  return (
    file.type === "application/pdf" ||
    file.type.startsWith("image/") ||
    /\.(pdf|png|jpe?g|webp)$/i.test(file.name)
  );
}

function inferMimeType(file: File) {
  if (file.type) return file.type;
  if (/\.pdf$/i.test(file.name)) return "application/pdf";
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.jpe?g$/i.test(file.name)) return "image/jpeg";
  if (/\.webp$/i.test(file.name)) return "image/webp";
  if (/\.gif$/i.test(file.name)) return "image/gif";
  if (/\.(txt|md)$/i.test(file.name)) return "text/plain";
  if (/\.csv$/i.test(file.name)) return "text/csv";
  return "application/octet-stream";
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
      extractedText,
    }: {
      file: File;
      teamId: string;
      folderId: string | null;
      isPrivate: boolean;
      extractedText?: string;
    }) => {
      let searchableText = extractedText?.trim();
      const mimeType = inferMimeType(file);

      const prepareFormData = new FormData();
      prepareFormData.append("fileName", file.name);
      prepareFormData.append("fileSize", String(file.size));
      prepareFormData.append("mimeType", mimeType);
      prepareFormData.append("teamId", teamId);

      const prepared = await prepareDocumentUpload(prepareFormData);
      if (!prepared.ok) {
        throw new Error(prepared.error);
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(prepared.bucket)
        .uploadToSignedUrl(prepared.storagePath, prepared.token, file, {
          contentType: prepared.mimeType,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const finalizeFormData = new FormData();
      finalizeFormData.append("storagePath", prepared.storagePath);
      finalizeFormData.append("fileName", file.name);
      finalizeFormData.append("fileSize", String(file.size));
      finalizeFormData.append("mimeType", prepared.mimeType);
      finalizeFormData.append("teamId", teamId);
      if (folderId) finalizeFormData.append("folderId", folderId);
      finalizeFormData.append("isPrivate", String(isPrivate));
      finalizeFormData.append("maxFileNameLength", "80");

      const result = await finalizeDocumentUpload(finalizeFormData);
      if (!result.ok) throw new Error(result.error);

      const record = result.file;

      if (searchableText) {
        try {
          await saveDocumentContent(record.id, searchableText);
        } catch (error) {
          console.warn("File uploaded, but search indexing failed:", error);
        }
      } else if (isOcrCandidate(file)) {
        try {
          await reindexDocument(record.id);
        } catch (error) {
          console.warn("File uploaded, but OCR indexing failed:", error);
        }
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

export function useReindexDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => reindexDocument(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
  });
}

export function useSignedUrl() {
  return useMutation({
    mutationFn: (storagePath: string) => getSignedDownloadUrl(storagePath),
  });
}
