"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFolders,
  getStarredFolders,
  createFolder,
  deleteFolder,
  archiveFolder,
  restoreFolder,
  moveFolder,
  getArchiveFolder,
} from "@/app/actions/storage";

export function useFolders(teamId: string | null, parentId: string | null) {
  return useQuery({
    queryKey: ["folders", teamId, parentId],
    queryFn: () => getFolders(teamId!, parentId),
    enabled: !!teamId,
  });
}

export function useStarredFolders(
  teamId: string | null,
  folderIds: string[]
) {
  return useQuery({
    queryKey: ["folders", "starred", teamId, folderIds],
    queryFn: () => getStarredFolders(teamId!, folderIds),
    enabled: !!teamId && folderIds.length > 0,
  });
}

export function useArchiveFolder() {
  return useQuery({
    queryKey: ["archiveFolder"],
    queryFn: () => Promise.resolve(null),
    enabled: false,
  });
}

export function useGetArchiveFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) => getArchiveFolder(teamId),
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      name,
      parentId,
    }: {
      teamId: string;
      name: string;
      parentId: string | null;
    }) => createFolder(teamId, name, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) => deleteFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}

export function useArchiveFolderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, teamId }: { folderId: string; teamId: string }) =>
      archiveFolder(folderId, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}

export function useRestoreFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) => restoreFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}

export function useMoveFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      folderId,
      newParentId,
    }: {
      folderId: string;
      newParentId: string | null;
    }) => moveFolder(folderId, newParentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}
