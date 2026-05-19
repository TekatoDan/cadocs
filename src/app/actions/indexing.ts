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

function normalizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ensurePdfJsNodeStubs() {
  const globalScope = globalThis as typeof globalThis & {
    DOMMatrix?: typeof DOMMatrix;
    ImageData?: typeof ImageData;
    Path2D?: typeof Path2D;
  };

  if (typeof globalScope.DOMMatrix === "undefined") {
    globalScope.DOMMatrix = class DOMMatrixStub {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;

      constructor(init?: number[]) {
        if (Array.isArray(init)) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = init;
        }
      }

      multiplySelf() {
        return this;
      }

      preMultiplySelf() {
        return this;
      }

      translateSelf() {
        return this;
      }

      scaleSelf() {
        return this;
      }

      rotateSelf() {
        return this;
      }

      invertSelf() {
        return this;
      }

      transformPoint(point: DOMPointInit) {
        return point;
      }
    } as unknown as typeof DOMMatrix;
  }

  if (typeof globalScope.ImageData === "undefined") {
    globalScope.ImageData = class ImageDataStub {
      data: Uint8ClampedArray;
      width: number;
      height: number;

      constructor(data: Uint8ClampedArray, width: number, height?: number) {
        this.data = data;
        this.width = width;
        this.height = height ?? 0;
      }
    } as unknown as typeof ImageData;
  }

  if (typeof globalScope.Path2D === "undefined") {
    globalScope.Path2D = class Path2DStub {} as unknown as typeof Path2D;
  }
}

export async function extractSearchTextFromPdfFile(
  file: File
): Promise<string | null> {
  const mimeType = getMimeType(file);
  if (mimeType !== "application/pdf") return null;

  try {
    ensurePdfJsNodeStubs();
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await (pdfjs.getDocument as any)({
      data,
      disableWorker: true,
      useSystemFonts: true,
    }).promise;
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: unknown) =>
          item && typeof item === "object" && "str" in item
            ? String(item.str ?? "")
            : ""
        )
        .filter(Boolean)
        .join(" ");
      if (pageText.trim()) pageTexts.push(pageText);
    }

    return normalizeExtractedText(pageTexts.join("\n\n")) || null;
  } catch (error) {
    console.warn("PDF text indexing failed:", error);
    return null;
  }
}

export async function extractSearchTextFromFileWithOcr(
  file: File
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  if (file.size === 0 || file.size > OCR_MAX_FILE_SIZE_BYTES) {
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

    return normalizeExtractedText(response.text ?? "") || null;
  } catch (error) {
    console.warn("OCR indexing failed:", error);
    return null;
  }
}

export async function extractSearchTextWithOcr(
  formData: FormData
): Promise<string | null> {
  await getAuthUser();

  const file = formData.get("file") as File | null;
  if (!file) return null;
  return extractSearchTextFromFileWithOcr(file);
}
