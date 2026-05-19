"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser, getSupabaseClient } from "@/lib/auth";
import { STORAGE_BUCKET } from "@/lib/storage-bucket";
import {
  extractSearchTextFromFileWithOcr,
  extractSearchTextFromPdfFile,
} from "@/app/actions/indexing";
import type { FolderRecord, UploadedFileRecord } from "@/lib/types";

const DEFAULT_MAX_FILE_NAME_LENGTH = 80;
const MIN_FILE_NAME_LENGTH = 16;

type UploadDocumentResult =
  | { ok: true; file: UploadedFileRecord }
  | { ok: false; error: string };

type ReindexDocumentResult =
  | { ok: true; indexed: boolean; message: string }
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

function inferMimeType(fileName: string) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".gif")) return "image/gif";
  if (lowerName.endsWith(".txt") || lowerName.endsWith(".md")) return "text/plain";
  if (lowerName.endsWith(".csv")) return "text/csv";
  return "application/octet-stream";
}

function isTextSearchableFile(fileName: string, mimeType: string) {
  return (
    mimeType.startsWith("text/") ||
    /\.(txt|md|csv|json|log)$/i.test(fileName)
  );
}

function isPdfFile(fileName: string, mimeType: string) {
  return mimeType === "application/pdf" || /\.pdf$/i.test(fileName);
}

function isImageFile(fileName: string, mimeType: string) {
  return (
    mimeType.startsWith("image/") ||
    /\.(png|jpe?g|webp)$/i.test(fileName)
  );
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

export async function updateFolderName(
  folderId: string,
  newName: string
): Promise<void> {
  await getAuthUser();
  await prisma.folder.update({
    where: { id: folderId },
    data: { name: newName },
  });
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
    const mimeType = file.type || inferMimeType(file.name);

    const fileExt = file.name.split(".").pop();
    const uniqueId = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    storagePath = `${teamId}/${uniqueId}${fileExt ? `.${fileExt}` : ""}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, arrayBuffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: mimeType,
      });

    if (uploadError) {
      console.error("Supabase storage upload failed:", {
        bucket: STORAGE_BUCKET,
        storagePath,
        message: uploadError.message,
      });
      return {
        ok: false,
        error:
          uploadError.message === "Bucket not found"
            ? `Storage bucket "${STORAGE_BUCKET}" was not found. Create it in Supabase Storage or set SUPABASE_STORAGE_BUCKET to the existing bucket id.`
            : `Storage upload failed: ${uploadError.message}`,
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
        mimeType,
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
  await saveDocumentContentForFile(fileId, content);
}

async function saveDocumentContentForFile(
  fileId: string,
  content: string
): Promise<void> {
  const normalizedContent = content
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalizedContent) return;

  const chunks = chunkDocumentContent(normalizedContent);

  await prisma.$transaction(async (tx) => {
    await tx.documentContent.deleteMany({ where: { fileId } });
    await tx.documentContent.createMany({
      data: chunks.map((chunk, index) => ({
        fileId,
        chunkIndex: index,
        content: chunk,
      })),
    });
  });
}

export async function reindexDocument(
  fileId: string
): Promise<ReindexDocumentResult> {
  try {
    const user = await getAuthUser();
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        OR: [
          { description: null },
          { description: { not: "__VISIBILITY_PRIVATE__" } },
          { description: "__VISIBILITY_PRIVATE__", createdBy: user.id },
        ],
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        storagePath: true,
      },
    });

    if (!file) {
      return { ok: false, error: "File not found or not accessible." };
    }

    const mimeType = file.mimeType || inferMimeType(file.name);
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(file.storagePath);

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || "Unable to read this file from storage.",
      };
    }

    const storedFile = new File([data], file.name, { type: mimeType });
    let searchableText: string | null = null;

    if (isTextSearchableFile(file.name, mimeType)) {
      searchableText = await data.text();
    } else if (isPdfFile(file.name, mimeType)) {
      searchableText = await extractSearchTextFromPdfFile(storedFile);
      if (!searchableText) {
        searchableText = await extractSearchTextFromFileWithOcr(storedFile);
      }
    } else if (isImageFile(file.name, mimeType)) {
      searchableText = await extractSearchTextFromFileWithOcr(storedFile);
    } else {
      return {
        ok: true,
        indexed: false,
        message: "This file type does not support search indexing yet.",
      };
    }

    if (!searchableText?.trim()) {
      const needsOcr = isPdfFile(file.name, mimeType) || isImageFile(file.name, mimeType);
      return {
        ok: true,
        indexed: false,
        message:
          needsOcr && !process.env.GEMINI_API_KEY
            ? "No embedded text was found. Add GEMINI_API_KEY to index scanned PDFs and images."
            : "No searchable text was found in this file.",
      };
    }

    await saveDocumentContentForFile(file.id, searchableText);

    return {
      ok: true,
      indexed: true,
      message: "Search index updated.",
    };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error, "Unable to update the search index."),
    };
  }
}

function chunkDocumentContent(content: string, chunkSize = 4000): string[] {
  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    let end = Math.min(cursor + chunkSize, content.length);
    if (end < content.length) {
      const paragraphBreak = content.lastIndexOf("\n\n", end);
      const sentenceBreak = content.lastIndexOf(". ", end);
      const spaceBreak = content.lastIndexOf(" ", end);
      const breakAt = Math.max(paragraphBreak, sentenceBreak, spaceBreak);
      if (breakAt > cursor + chunkSize * 0.6) {
        end = breakAt + (breakAt === sentenceBreak ? 1 : 0);
      }
    }

    const chunk = content.slice(cursor, end).trim();
    if (chunk) chunks.push(chunk);
    cursor = end;
  }

  return chunks.length > 0 ? chunks : [content];
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
    .from(STORAGE_BUCKET)
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
    .from(STORAGE_BUCKET)
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
