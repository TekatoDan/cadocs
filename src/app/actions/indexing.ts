"use server";

import { GoogleGenAI, createPartFromBase64 } from "@google/genai";
import { getAuthUser } from "@/lib/auth";

const OCR_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const OCR_MODEL = process.env.GEMINI_OCR_MODEL || "gemini-2.5-flash";

function getMimeType(file: File) {
  if (file.type) return file.type;
  if (/\.pdf$/i.test(file.name)) return "application/pdf";
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.jpe?g$/i.test(file.name)) return "image/jpeg";
  if (/\.webp$/i.test(file.name)) return "image/webp";
  return "application/octet-stream";
}

export async function extractSearchTextWithOcr(
  formData: FormData
): Promise<string | null> {
  await getAuthUser();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0 || file.size > OCR_MAX_FILE_SIZE_BYTES) {
    return null;
  }

  const mimeType = getMimeType(file);
  if (mimeType !== "application/pdf" && !mimeType.startsWith("image/")) {
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const bytes = Buffer.from(await file.arrayBuffer());
    const response = await ai.models.generateContent({
      model: OCR_MODEL,
      contents: [
        {
          text:
            "Extract all visible text from this document for search indexing. " +
            "Return only the document text. Preserve line breaks where useful. " +
            "Do not summarize and do not add commentary.",
        },
        createPartFromBase64(bytes.toString("base64"), mimeType),
      ],
    });

    return response.text?.trim() || null;
  } catch (error) {
    console.warn("OCR indexing failed:", error);
    return null;
  }
}
