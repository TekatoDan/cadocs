"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser, getSupabaseClient } from "@/lib/auth";
import type { FolderRecord, UploadedFileRecord } from "@/lib/types";

// Helper to convert Prisma BigInt to number for JSON serialization
function serializeFile(file: any): UploadedFileRecord {
  return {
    ...file,
    size_bytes: Number(file.sizeBytes),
    mime_type: file.mimeType,
    storage_path: file.storagePath,
    team_id: file.teamId,
    folder_id: file.folderId,
    created_at: file.createdAt.toISOString(),
    created_by: file.createdBy,
  };
}

function serializeFolder(folder: any): FolderRecord {
  return {
    id: folder.id,
    team_id: folder.teamId,
    name: folder.name,
    parent_id: folder.parentId,
    created_at: folder.createdAt.toISOString(),
    created_by: folder.createdBy,
  };
}

export async function createFolder(
  teamId: string,
  name: string,
  parentId: string | null = null
): Promise<FolderRecord> {
  const user = await getAuthUser();
  const folder = await prisma.folder.create({
    data: {
      teamId,
      name,
      parentId,
      createdBy: user.id,
    },
  });
  return serializeFolder(folder);
}

export async function getFolders(
  teamId: string,
  parentId: string | null = null
): Promise<FolderRecord[]> {
  await getAuthUser();

  const where: any = { teamId };
  if (parentId) {
    where.parentId = parentId;
  } else {
    where.parentId = null;
    where.name = { not: ".archive" };
  }

  const folders = await prisma.folder.findMany({
    where,
    orderBy: { name: "asc" },
  });
  return folders.map(serializeFolder);
}

export async function getArchiveFolder(teamId: string): Promise<FolderRecord> {
  const user = await getAuthUser();

  let folder = await prisma.folder.findFirst({
    where: { teamId, parentId: null, name: ".archive" },
  });

  if (folder) return serializeFolder(folder);

  folder = await prisma.folder.create({
    data: {
      teamId,
      name: ".archive",
      parentId: null,
      createdBy: user.id,
    },
  });
  return serializeFolder(folder);
}

export async function archiveFolder(
  folderId: string,
  teamId: string
): Promise<void> {
  const archive = await getArchiveFolder(teamId);
  await prisma.folder.update({
    where: { id: folderId },
    data: { parentId: archive.id },
  });
}

export async function restoreFolder(folderId: string): Promise<void> {
  await getAuthUser();
  await prisma.folder.update({
    where: { id: folderId },
    data: { parentId: null },
  });
}

export async function deleteFolder(folderId: string): Promise<void> {
  await getAuthUser();
  await prisma.folder.delete({ where: { id: folderId } });
}

export async function moveFolder(
  folderId: string,
  newParentId: string | null
): Promise<void> {
  await getAuthUser();
  await prisma.folder.update({
    where: { id: folderId },
    data: { parentId: newParentId },
  });
}

export async function moveDocument(
  fileId: string,
  newFolderId: string | null
): Promise<void> {
  await getAuthUser();
  await prisma.file.update({
    where: { id: fileId },
    data: { folderId: newFolderId },
  });
}

export async function uploadDocument(
  formData: FormData
): Promise<UploadedFileRecord> {
  const user = await getAuthUser();
  const supabase = await getSupabaseClient();

  const file = formData.get("file") as File;
  const teamId = formData.get("teamId") as string;
  const folderId = (formData.get("folderId") as string) || null;
  const isPrivate = formData.get("isPrivate") === "true";

  // Check duplicate
  const existing = await prisma.file.findFirst({
    where: {
      teamId,
      name: file.name,
      folderId: folderId || null,
    },
  });
  if (existing) {
    throw new Error(`A file named "${file.name}" already exists in this location.`);
  }

  // Upload to Supabase Storage
  const fileExt = file.name.split(".").pop();
  const uniqueId = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
  const storagePath = `${teamId}/${uniqueId}.${fileExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("Cadocs-Bucket")
    .upload(storagePath, arrayBuffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw new Error(uploadError.message);

  // Create DB record via Prisma
  try {
    const record = await prisma.file.create({
      data: {
        teamId,
        folderId,
        name: file.name,
        description: isPrivate ? "__VISIBILITY_PRIVATE__" : null,
        storagePath,
        sizeBytes: BigInt(file.size),
        mimeType: file.type,
        status: "draft",
        createdBy: user.id,
      },
    });
    return serializeFile(record);
  } catch (dbError: any) {
    await supabase.storage.from("Cadocs-Bucket").remove([storagePath]);
    throw new Error(dbError.message);
  }
}

export async function saveDocumentContent(
  fileId: string,
  content: string
): Promise<void> {
  await getAuthUser();
  await prisma.documentContent.create({
    data: { fileId, chunkIndex: 0, content },
  });
}

export async function getTeamFiles(
  teamId: string,
  folderId: string | null = null
): Promise<UploadedFileRecord[]> {
  const user = await getAuthUser();

  const files = await prisma.file.findMany({
    where: {
      teamId,
      folderId: folderId || null,
      OR: [
        { description: null },
        { description: { not: "__VISIBILITY_PRIVATE__" } },
        { description: "__VISIBILITY_PRIVATE__", createdBy: user.id },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  return files.map(serializeFile);
}

export async function getRecentFiles(
  teamId: string,
  limit: number = 20
): Promise<UploadedFileRecord[]> {
  const user = await getAuthUser();

  const files = await prisma.file.findMany({
    where: {
      teamId,
      status: { not: "archived" },
      OR: [
        { description: null },
        { description: { not: "__VISIBILITY_PRIVATE__" } },
        { description: "__VISIBILITY_PRIVATE__", createdBy: user.id },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return files.map(serializeFile);
}

export async function getStarredFiles(
  teamId: string,
  fileIds: string[]
): Promise<UploadedFileRecord[]> {
  if (fileIds.length === 0) return [];
  const user = await getAuthUser();

  const files = await prisma.file.findMany({
    where: {
      teamId,
      id: { in: fileIds },
      status: { not: "archived" },
      OR: [
        { description: null },
        { description: { not: "__VISIBILITY_PRIVATE__" } },
        { description: "__VISIBILITY_PRIVATE__", createdBy: user.id },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  return files.map(serializeFile);
}

export async function getStarredFolders(
  teamId: string,
  folderIds: string[]
): Promise<FolderRecord[]> {
  if (folderIds.length === 0) return [];
  await getAuthUser();

  const folders = await prisma.folder.findMany({
    where: {
      teamId,
      id: { in: folderIds },
    },
    orderBy: { name: "asc" },
  });
  return folders.map(serializeFolder);
}

export async function getSignedDownloadUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.storage
    .from("Cadocs-Bucket")
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function updateDocumentName(
  fileId: string,
  newName: string
): Promise<void> {
  await getAuthUser();
  await prisma.file.update({
    where: { id: fileId },
    data: { name: newName },
  });
}

export async function deleteDocument(
  fileId: string,
  storagePath: string
): Promise<void> {
  await getAuthUser();
  const supabase = await getSupabaseClient();

  const { error: storageError } = await supabase.storage
    .from("Cadocs-Bucket")
    .remove([storagePath]);
  if (storageError) throw new Error(storageError.message);

  await prisma.file.delete({ where: { id: fileId } });
}

export async function archiveDocument(
  fileId: string,
  teamId: string
): Promise<void> {
  const archive = await getArchiveFolder(teamId);
  await prisma.file.update({
    where: { id: fileId },
    data: { folderId: archive.id, status: "archived" },
  });
}

export async function restoreDocument(fileId: string): Promise<void> {
  await getAuthUser();
  await prisma.file.update({
    where: { id: fileId },
    data: { folderId: null, status: "draft" },
  });
}
