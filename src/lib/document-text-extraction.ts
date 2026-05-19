import { GoogleGenAI, createPartFromBase64 } from "@google/genai";
import mammoth from "mammoth";
import { OfficeParser, type OfficeContentNode } from "officeparser";
import WordExtractor from "word-extractor";
import * as XLSX from "xlsx";

export type DocumentFileKind =
  | "pdf"
  | "docx"
  | "doc"
  | "txt"
  | "xlsx"
  | "pptx"
  | "image";

export type DocumentIndexingStatus =
  | "uploaded"
  | "scanning_content"
  | "ocr_processing"
  | "indexed"
  | "failed_to_extract_text";

export interface ExtractedTextSection {
  content: string;
  pageNumber?: number | null;
  section?: string | null;
  source: string;
}

export interface ExtractionResult {
  sections: ExtractedTextSection[];
  fileKind: DocumentFileKind | null;
  usedOcr: boolean;
  warnings: string[];
  error?: string;
}

export interface OcrProviderInput {
  file: File;
  mimeType: string;
  fileKind: DocumentFileKind;
  pageCount?: number;
}

export interface ExtractReadableTextOptions {
  forceOcr?: boolean;
  ocrProvider?: (input: OcrProviderInput) => Promise<ExtractedTextSection[]>;
  onStatus?: (status: DocumentIndexingStatus) => Promise<void> | void;
}

const OCR_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const OCR_MODEL = process.env.GEMINI_OCR_MODEL || "gemini-2.5-flash";
const PDF_MIN_TEXT_CHARS = 8;
const PDF_MULTI_PAGE_MIN_TEXT_CHARS = 20;

function getMimeType(file: File) {
  return file.type || inferMimeType(file.name);
}

export function inferMimeType(fileName: string) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lowerName.endsWith(".doc")) return "application/msword";
  if (lowerName.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (lowerName.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lowerName.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".txt") || lowerName.endsWith(".md")) return "text/plain";
  if (lowerName.endsWith(".csv")) return "text/csv";
  return "application/octet-stream";
}

export function getDocumentFileKind(
  fileName: string,
  mimeType: string
): DocumentFileKind | null {
  const lowerName = fileName.toLowerCase();

  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) return "pdf";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    return "docx";
  }
  if (mimeType === "application/msword" || lowerName.endsWith(".doc")) return "doc";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    /\.(xlsx|xls)$/i.test(fileName)
  ) {
    return "xlsx";
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    lowerName.endsWith(".pptx")
  ) {
    return "pptx";
  }
  if (
    mimeType.startsWith("text/") ||
    /\.(txt|md|csv|log|json)$/i.test(fileName)
  ) {
    return "txt";
  }
  if (
    /^image\/(png|jpe?g|webp)$/i.test(mimeType) ||
    /\.(png|jpe?g|webp)$/i.test(fileName)
  ) {
    return "image";
  }

  return null;
}

export function normalizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hasReadableText(sections: ExtractedTextSection[]) {
  return sections.some((section) => normalizeExtractedText(section.content).length > 0);
}

export function flattenExtractedSections(sections: ExtractedTextSection[]) {
  return sections
    .map((section) => normalizeExtractedText(section.content))
    .filter(Boolean)
    .join("\n\n");
}

export async function extractReadableTextFromFile(
  file: File,
  options: ExtractReadableTextOptions = {}
): Promise<ExtractionResult> {
  const mimeType = getMimeType(file);
  const fileKind = getDocumentFileKind(file.name, mimeType);
  const warnings: string[] = [];

  if (!fileKind) {
    return {
      sections: [],
      fileKind,
      usedOcr: false,
      warnings,
      error: `Text extraction for ${mimeType} is not supported.`,
    };
  }

  await options.onStatus?.("scanning_content");

  try {
    if (fileKind === "pdf") {
      const pdfText = await extractPdfTextSections(file);
      const needsOcr =
        options.forceOcr || isPdfTextUnreliable(pdfText.sections, pdfText.pageCount);

      if (!needsOcr) {
        return {
          sections: pdfText.sections,
          fileKind,
          usedOcr: false,
          warnings: [...warnings, ...pdfText.warnings],
        };
      }

      await options.onStatus?.("ocr_processing");
      const ocrSections = await runOcr(file, mimeType, fileKind, options, pdfText.pageCount);
      if (hasReadableText(ocrSections)) {
        return {
          sections: ocrSections,
          fileKind,
          usedOcr: true,
          warnings: [...warnings, ...pdfText.warnings],
        };
      }

      if (hasReadableText(pdfText.sections)) {
        warnings.push("OCR did not return text; indexed the embedded PDF text.");
        return {
          sections: pdfText.sections,
          fileKind,
          usedOcr: false,
          warnings: [...warnings, ...pdfText.warnings],
        };
      }

      return {
        sections: [],
        fileKind,
        usedOcr: false,
        warnings: [...warnings, ...pdfText.warnings],
        error: "No readable PDF text was found and OCR did not return text.",
      };
    }

    if (fileKind === "image") {
      await options.onStatus?.("ocr_processing");
      const sections = await runOcr(file, mimeType, fileKind, options);
      return buildResultFromSections(sections, fileKind, true, warnings);
    }

    const sections = await extractDirectTextSections(file, fileKind);
    return buildResultFromSections(sections, fileKind, false, warnings);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Text extraction failed.";
    return {
      sections: [],
      fileKind,
      usedOcr: false,
      warnings,
      error: message,
    };
  }
}

async function extractDirectTextSections(
  file: File,
  fileKind: Exclude<DocumentFileKind, "pdf" | "image">
): Promise<ExtractedTextSection[]> {
  if (fileKind === "txt") {
    return [
      {
        content: normalizeExtractedText(await file.text()),
        source: "text",
      },
    ];
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (fileKind === "docx") {
    try {
      const ast = await OfficeParser.parseOffice(buffer, {
        fileType: "docx",
        newlineDelimiter: "\n",
        includeBreakNodes: true,
      });
      const structuredText = normalizeExtractedText(
        ast.content.map(nodeToStructuredText).filter(Boolean).join("\n\n")
      );
      if (structuredText) {
        return [
          {
            content: structuredText,
            source: "docx",
          },
        ];
      }
    } catch {
      // Fall through to Mammoth, which is a strong DOCX text fallback.
    }

    const result = await mammoth.extractRawText({ buffer });
    return [
      {
        content: normalizeExtractedText(result.value),
        source: "docx",
      },
    ];
  }

  if (fileKind === "doc") {
    const extractor = new WordExtractor();
    const document = await extractor.extract(buffer);
    const parts = [
      document.getHeaders?.(),
      document.getBody?.(),
      document.getTextboxes?.(),
      document.getFootnotes?.(),
      document.getEndnotes?.(),
      document.getFooters?.(),
      document.getAnnotations?.(),
    ];
    return [
      {
        content: normalizeExtractedText(parts.filter(Boolean).join("\n\n")),
        source: "doc",
      },
    ];
  }

  if (fileKind === "xlsx") {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    return workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const content = XLSX.utils.sheet_to_csv(sheet, {
        FS: "\t",
        RS: "\n",
        blankrows: false,
      });
      return {
        content: normalizeExtractedText(content),
        section: sheetName,
        source: "xlsx",
      };
    });
  }

  const ast = await OfficeParser.parseOffice(buffer, {
    fileType: "pptx",
    newlineDelimiter: "\n",
    ignoreNotes: false,
  });
  const slideSections = ast.content
    .filter((node) => node.type === "slide")
    .map((node, index) => {
      const metadata = node.metadata as { slideNumber?: number } | undefined;
      const slideNumber = metadata?.slideNumber ?? index + 1;
      return {
        content: normalizeExtractedText(nodeToStructuredText(node)),
        section: `Slide ${slideNumber}`,
        source: "pptx",
      };
    });

  if (slideSections.length > 0) return slideSections;

  const converted = await ast.to("text");
  return [
    {
      content: normalizeExtractedText(String(converted.value ?? "")),
      source: "pptx",
    },
  ];
}

function buildResultFromSections(
  sections: ExtractedTextSection[],
  fileKind: DocumentFileKind,
  usedOcr: boolean,
  warnings: string[]
): ExtractionResult {
  const normalizedSections = normalizeSections(sections);
  if (!hasReadableText(normalizedSections)) {
    return {
      sections: [],
      fileKind,
      usedOcr,
      warnings,
      error: "No readable text was found in this file.",
    };
  }

  return {
    sections: normalizedSections,
    fileKind,
    usedOcr,
    warnings,
  };
}

function normalizeSections(sections: ExtractedTextSection[]) {
  return sections
    .map((section) => ({
      ...section,
      content: normalizeExtractedText(section.content),
      pageNumber: section.pageNumber ?? null,
      section: section.section ?? null,
    }))
    .filter((section) => section.content.length > 0);
}

function isPdfTextUnreliable(
  sections: ExtractedTextSection[],
  pageCount: number
) {
  const readableSections = sections.filter(
    (section) => normalizeExtractedText(section.content).length > 0
  );
  const totalLength = flattenExtractedSections(readableSections).length;

  if (totalLength === 0) return true;
  if (totalLength < PDF_MIN_TEXT_CHARS) return true;
  if (pageCount > 1 && totalLength < PDF_MULTI_PAGE_MIN_TEXT_CHARS) return true;
  if (pageCount > 1 && readableSections.length / pageCount < 0.5) return true;

  return false;
}

async function extractPdfTextSections(file: File): Promise<{
  sections: ExtractedTextSection[];
  pageCount: number;
  warnings: string[];
}> {
  try {
    ensurePdfJsNodeStubs();
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await (pdfjs.getDocument as any)({
      data,
      disableWorker: true,
      useSystemFonts: true,
    }).promise;
    const sections: ExtractedTextSection[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = extractPdfPageText(textContent.items);
      sections.push({
        content: pageText,
        pageNumber,
        section: `Page ${pageNumber}`,
        source: "pdf_text",
      });
    }

    return {
      sections: normalizeSections(sections),
      pageCount: pdf.numPages,
      warnings: [],
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "PDF text extraction failed.";
    return {
      sections: [],
      pageCount: 0,
      warnings: [message],
    };
  }
}

function extractPdfPageText(items: unknown[]) {
  const textItems = items
    .map((item) => {
      if (!item || typeof item !== "object" || !("str" in item)) return null;
      const maybeTextItem = item as {
        str?: string;
        transform?: number[];
        width?: number;
      };
      const text = String(maybeTextItem.str ?? "").trim();
      if (!text) return null;
      const transform = maybeTextItem.transform ?? [];
      return {
        text,
        x: Number(transform[4] ?? 0),
        y: Number(transform[5] ?? 0),
        width: Number(maybeTextItem.width ?? 0),
      };
    })
    .filter((item): item is { text: string; x: number; y: number; width: number } => !!item)
    .sort((a, b) => {
      const yDelta = b.y - a.y;
      if (Math.abs(yDelta) > 2) return yDelta;
      return a.x - b.x;
    });

  const lines: { y: number; items: typeof textItems }[] = [];
  for (const item of textItems) {
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 2);
    if (line) {
      line.items.push(item);
    } else {
      lines.push({ y: item.y, items: [item] });
    }
  }

  return normalizeExtractedText(
    lines
      .map((line) =>
        line.items
          .sort((a, b) => a.x - b.x)
          .map((item) => item.text)
          .join(" ")
      )
      .join("\n")
  );
}

async function runOcr(
  file: File,
  mimeType: string,
  fileKind: DocumentFileKind,
  options: ExtractReadableTextOptions,
  pageCount?: number
) {
  const sections = options.ocrProvider
    ? await options.ocrProvider({ file, mimeType, fileKind, pageCount })
    : await extractTextWithGeminiOcr(file, mimeType, fileKind, pageCount);

  return normalizeSections(
    sections.map((section) => ({
      ...section,
      source: section.source || "ocr",
    }))
  );
}

async function extractTextWithGeminiOcr(
  file: File,
  mimeType: string,
  fileKind: DocumentFileKind,
  pageCount?: number
): Promise<ExtractedTextSection[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured for OCR extraction.");
  }

  if (file.size === 0) {
    throw new Error("The file is empty.");
  }

  if (file.size > OCR_MAX_FILE_SIZE_BYTES) {
    throw new Error("The file is too large for OCR extraction.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const bytes = Buffer.from(await file.arrayBuffer());
  const isPdf = fileKind === "pdf";
  const prompt = isPdf
    ? [
        "Extract all readable visible text from every page of this PDF for search indexing.",
        "Return strict JSON only in this shape:",
        '{"pages":[{"pageNumber":1,"text":"page text"}]}',
        pageCount ? `Include page numbers 1 through ${pageCount}.` : "Include page numbers when available.",
        "Preserve headings, line breaks, tables, and page-local reading order where useful.",
        "Do not summarize and do not add commentary.",
      ].join(" ")
    : [
        "Extract all readable visible text from this image for search indexing.",
        "Return strict JSON only in this shape:",
        '{"pages":[{"pageNumber":1,"text":"image text"}]}',
        "Preserve line breaks and table-like layout where useful.",
        "Do not summarize and do not add commentary.",
      ].join(" ");

  const response = await ai.models.generateContent({
    model: OCR_MODEL,
    contents: [
      { text: prompt },
      createPartFromBase64(bytes.toString("base64"), mimeType),
    ],
  });
  const responseText = response.text ?? "";
  const parsed = parseOcrJson(responseText);

  if (parsed.length > 0) return parsed;

  const fallbackText = normalizeExtractedText(stripMarkdownJsonFence(responseText));
  if (!fallbackText) {
    throw new Error("OCR completed but returned no text.");
  }

  return [
    {
      content: fallbackText,
      pageNumber: isPdf ? null : 1,
      section: isPdf ? null : "Image",
      source: "ocr",
    },
  ];
}

function parseOcrJson(value: string): ExtractedTextSection[] {
  const candidates = [value, stripMarkdownJsonFence(value), extractJsonObject(value)];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as {
        pages?: { pageNumber?: number; text?: string }[];
      };
      if (!Array.isArray(parsed.pages)) continue;
      return parsed.pages
        .map((page, index) => ({
          content: normalizeExtractedText(String(page.text ?? "")),
          pageNumber:
            typeof page.pageNumber === "number" && Number.isFinite(page.pageNumber)
              ? page.pageNumber
              : index + 1,
          section: `Page ${
            typeof page.pageNumber === "number" && Number.isFinite(page.pageNumber)
              ? page.pageNumber
              : index + 1
          }`,
          source: "ocr",
        }))
        .filter((page) => page.content.length > 0);
    } catch {
      // Try the next candidate.
    }
  }

  return [];
}

function stripMarkdownJsonFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function extractJsonObject(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return "";
  return value.slice(start, end + 1);
}

function nodeToStructuredText(node: OfficeContentNode): string {
  if (!node.children || node.children.length === 0) {
    return node.text ?? "";
  }

  if (node.type === "table") {
    return node.children.map(nodeToStructuredText).filter(Boolean).join("\n");
  }

  if (node.type === "row") {
    return node.children.map(nodeToStructuredText).filter(Boolean).join("\t");
  }

  if (node.type === "cell") {
    return node.children.map(nodeToStructuredText).filter(Boolean).join(" ");
  }

  const childText = node.children.map(nodeToStructuredText).filter(Boolean).join("\n");
  return childText || node.text || "";
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
