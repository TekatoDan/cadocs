"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser, getSupabaseClient } from "@/lib/auth";
import type { FolderRecord, UploadedFileRecord } from "@/lib/types";

const STORAGE_BUCKET = "Cadocs-Bucket";
const DEFAULT_MAX_FILE_NAME_LENGTH = 80;
const MIN_FILE_NAME_LENGTH = 16;

type UploadDocumentResult =
  | { ok: true; file: UploadedFileRecord }
  | { ok: false; error: string };

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function clampFileNameLength(value: FormDataEntryValue | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_FILE_NAME_LENGTH;
  return Math.max(MIN_FILE_NAME_LENGTH, Math.min(160, Math.floor(parsed)));
}

function splitFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return { baseName: fileName, extension: "" };
  }

  return {
    baseName: fileName.slice(0, dotIndex),
    extension: fileName.slice(dotIndex),
  };
}

function shortenFileName(fileName: string, maxLength: number, suffix = "") {
  const normalizedName = fileName.replace(/\s+/g, " ").trim();
  if (normalizedName.length <= maxLength && !suffix) return normalizedName;

  const { baseName, extension } = splitFileName(normalizedName);
  const availableBaseLength = Math.max(
    1,
    maxLength - extension.length - suffix.length
  );
  const shortenedBase =
    baseName.length > availableBaseLength
      ? baseName.slice(0, availableBaseLength).trimEnd()
      : baseName;

  return `${shortenedBase}${suffix}${extension}`;
}

async function getAvailableFileName(
  teamId: string,
  folderId: string | null,
  originalName: string,
  maxLength: number
) {
  const shortenedName = shortenFileName(originalName, maxLength);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const candidate =
      attempt === 0 ? shortenedName : shortenFileName(originalName, maxLength, suffix);
    const existing = await prisma.file.findFirst({
      where: {
        teamId,
        name: candidate,
        folderId,
      },
      select: { id: true },
    });

    if (!existing) return candidate;
  }

  throw new Error("Unable to create a unique shortened file name in this folder.");
}

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
): Promise<UploadDocumentResult> {
  let storagePath: string | null = null;

  try {
    const user = await getAuthUser();
    const supabase = await getSupabaseClient();

    const file = formData.get("file") as File | null;
    const teamId = formData.get("teamId") as string | null;
    const folderId = (formData.get("folderId") as string) || null;
    const isPrivate = formData.get("isPrivate") === "true";
    const maxFileNameLength = clampFileNameLength(
      formData.get("maxFileNameLength")
    );

    if (!file || !teamId) {
      return {
        ok: false,
        error: "Upload is missing the file or destination team.",
      };
    }

    const displayName = await getAvailableFileName(
      teamId,
      folderId || null,
      file.name,
      maxFileNameLength
    );

    const fileExt = file.name.split(".").pop();
    const uniqueId = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    storagePath = `${teamId}/${uniqueId}${fileExt ? `.${fileExt}` : ""}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, arrayBuffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      console.error("Supabase storage upload failed:", {
        bucket: STORAGE_BUCKET,
        storagePath,
        message: uploadError.message,
      });
      return {
        ok: false,
        error: `Storage upload failed: ${uploadError.message}`,
      };
    }

    const record = await prisma.file.create({
      data: {
        teamId,
        folderId,
        name: displayName,
        description: isPrivate ? "__VISIBILITY_PRIVATE__" : null,
        storagePath,
        sizeBytes: BigInt(file.size),
        mimeType: file.type,
        status: "draft",
        createdBy: user.id,
      },
    });
    return { ok: true, file: serializeFile(record) };
  } catch (error) {
    console.error("Document upload failed:", error);
    if (storagePath) {
      try {
        const supabase = await getSupabaseClient();
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      } catch (cleanupError) {
        console.error("Failed to clean up uploaded object:", cleanupError);
      }
    }

    return {
      ok: false,
      error: getErrorMessage(error, "Upload failed. Please try again."),
    };
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
