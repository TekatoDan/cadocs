import { File as NodeFile } from "node:buffer";
import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  extractReadableTextFromFile,
  flattenExtractedSections,
} from "./document-text-extraction";
import {
  getSearchTerms,
  matchesSearchTerms,
  normalizeSearchText,
} from "./search-match";

function makeFile(parts: BlobPart[], name: string, type: string) {
  return new NodeFile(parts as any[], name, { type }) as unknown as File;
}

async function makeTextPdf(text: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(text, {
    x: 72,
    y: 720,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  });
  return makeFile([await pdf.save()], "searchable.pdf", "application/pdf");
}

async function makeBlankPdf() {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  return makeFile([await pdf.save()], "scanned.pdf", "application/pdf");
}

async function makeDocx(text: string) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`
  );
  zip.folder("word")?.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:r><w:t>${text}</w:t></w:r></w:p>
      </w:body>
    </w:document>`
  );
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return makeFile(
    [bytes],
    "ordinance.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

test("extracts searchable text-based PDF content with page numbers", async () => {
  const file = await makeTextPdf("Capital Improvements Permit Alpha");
  const result = await extractReadableTextFromFile(file, {
    ocrProvider: async () => {
      throw new Error("OCR should not run for a text PDF");
    },
  });

  assert.equal(result.error, undefined);
  assert.equal(result.usedOcr, false);
  assert.match(flattenExtractedSections(result.sections), /Permit Alpha/);
  assert.equal(result.sections[0]?.pageNumber, 1);
});

test("falls back to OCR for scanned PDFs", async () => {
  const file = await makeBlankPdf();
  const result = await extractReadableTextFromFile(file, {
    ocrProvider: async ({ pageCount }) => [
      {
        content: `OCR page count ${pageCount}: Scanned Permit Bravo`,
        pageNumber: 1,
        source: "ocr",
      },
    ],
  });

  assert.equal(result.error, undefined);
  assert.equal(result.usedOcr, true);
  assert.match(flattenExtractedSections(result.sections), /Scanned Permit Bravo/);
  assert.equal(result.sections[0]?.pageNumber, 1);
});

test("extracts DOCX body text", async () => {
  const file = await makeDocx("Council Resolution Charlie");
  const result = await extractReadableTextFromFile(file);

  assert.equal(result.error, undefined);
  assert.match(flattenExtractedSections(result.sections), /Resolution Charlie/);
});

test("runs OCR automatically for image files", async () => {
  const file = makeFile([new Uint8Array([137, 80, 78, 71])], "notice.png", "image/png");
  const result = await extractReadableTextFromFile(file, {
    ocrProvider: async () => [
      { content: "Image Notice Delta", pageNumber: 1, source: "ocr" },
    ],
  });

  assert.equal(result.error, undefined);
  assert.equal(result.usedOcr, true);
  assert.match(flattenExtractedSections(result.sections), /Image Notice Delta/);
});

test("marks files with no readable text as extraction failures", async () => {
  const file = makeFile([""], "empty.txt", "text/plain");
  const result = await extractReadableTextFromFile(file);

  assert.equal(result.sections.length, 0);
  assert.match(result.error ?? "", /No readable text/);
});

test("matches search terms by filename", () => {
  const query = "zoning perm";
  assert.equal(
    matchesSearchTerms(
      "zoning-permit-2026.pdf",
      normalizeSearchText(query),
      getSearchTerms(query)
    ),
    true
  );
});

test("matches search terms by document content", () => {
  const query = "building permit";
  assert.equal(
    matchesSearchTerms(
      "The scanned page contains a Building Permit approval.",
      normalizeSearchText(query),
      getSearchTerms(query)
    ),
    true
  );
});
