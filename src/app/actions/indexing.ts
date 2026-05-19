"use server";

import { getAuthUser } from "@/lib/auth";
import {
  extractReadableTextFromFile,
  flattenExtractedSections,
} from "@/lib/document-text-extraction";

export async function extractSearchTextFromPdfFile(
  file: File
): Promise<string | null> {
  const result = await extractReadableTextFromFile(file);
  if (result.fileKind !== "pdf" || result.error) return null;
  return flattenExtractedSections(result.sections) || null;
}

export async function extractSearchTextFromFileWithOcr(
  file: File
): Promise<string | null> {
  const result = await extractReadableTextFromFile(file, { forceOcr: true });
  if (result.error) return null;
  return flattenExtractedSections(result.sections) || null;
}

export async function extractSearchTextWithOcr(
  formData: FormData
): Promise<string | null> {
  await getAuthUser();

  const file = formData.get("file") as File | null;
  if (!file) return null;
  return extractSearchTextFromFileWithOcr(file);
}
