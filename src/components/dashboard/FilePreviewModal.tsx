"use client";

import { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { FileText, X, Printer, Download, Loader2 } from "lucide-react";
import { useSignedUrl } from "@/hooks/use-files";
import type { UploadedFileRecord } from "@/lib/types";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface FilePreviewModalProps {
  file: UploadedFileRecord | null;
  onClose: () => void;
  onDownload: (storagePath: string, fileName: string) => void;
}

const TEXT_EXTENSIONS = [
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".xml",
  ".html",
  ".css",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".rb",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".sh",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".cfg",
  ".log",
  ".env",
  ".sql",
  ".graphql",
  ".svelte",
  ".vue",
];

function isTextFile(mimeType: string, fileName: string): boolean {
  if (mimeType.startsWith("text/")) return true;
  const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
  return TEXT_EXTENSIONS.includes(ext);
}

export default function FilePreviewModal({
  file,
  onClose,
  onDownload,
}: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  const signedUrlMutation = useSignedUrl();

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setPreviewText(null);
      setPreviewLoading(false);
      setNumPages(null);
      setPageNumber(1);
      return;
    }

    let cancelled = false;

    async function loadPreview() {
      if (!file) return;
      setPreviewLoading(true);
      setPreviewUrl(null);
      setPreviewText(null);
      setNumPages(null);
      setPageNumber(1);

      try {
        const url = await signedUrlMutation.mutateAsync(file.storage_path);

        if (cancelled) return;

        if (isTextFile(file.mime_type, file.name)) {
          const response = await fetch(url);
          const text = await response.text();
          if (!cancelled) {
            setPreviewText(text);
          }
        } else if (file.mime_type === "application/pdf") {
          setPreviewUrl(url);
        } else if (file.mime_type.startsWith("image/")) {
          setPreviewUrl(url);
        } else {
          setPreviewUrl(url);
        }
      } catch (error) {
        console.error("Failed to load preview:", error);
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const handlePrint = useCallback(() => {
    if (!file) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    if (previewText) {
      printWindow.document.write(`
        <html>
          <head><title>${file.name}</title></head>
          <body>
            <pre style="font-family: monospace; white-space: pre-wrap; word-wrap: break-word;">${previewText}</pre>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
    } else if (previewUrl && file.mime_type.startsWith("image/")) {
      printWindow.document.write(`
        <html>
          <head><title>${file.name}</title></head>
          <body style="margin: 0; display: flex; justify-content: center; align-items: center;">
            <img src="${previewUrl}" style="max-width: 100%; max-height: 100vh;" />
            <script>
              document.querySelector('img').onload = function() { window.print(); };
            </script>
          </body>
        </html>
      `);
    } else if (previewUrl && file.mime_type === "application/pdf") {
      printWindow.location.href = previewUrl;
    }

    printWindow.document.close();
  }, [file, previewText, previewUrl]);

  if (!file) return null;

  const isPdf = file.mime_type === "application/pdf";
  const isImage = file.mime_type.startsWith("image/");
  const isText = previewText !== null;
  const isUnsupported = !previewLoading && !isText && !isPdf && !isImage;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-navy-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-navy-700">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {file.name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-slate-200"
              title="Print"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-slate-200"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {previewLoading && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          )}

          {isText && (
            <pre className="overflow-auto rounded-xl bg-slate-50 p-4 dark:bg-navy-800">
              <code className="font-mono text-sm text-slate-800 dark:text-slate-200">
                {previewText}
              </code>
            </pre>
          )}

          {isImage && previewUrl && (
            <div className="flex h-full items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={file.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}

          {isPdf && previewUrl && (
            <div className="flex flex-col items-center gap-4">
              <Document
                file={previewUrl}
                onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                loading={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                }
              >
                {numPages &&
                  Array.from({ length: numPages }, (_, i) => (
                    <Page
                      key={i + 1}
                      pageNumber={i + 1}
                      className="mb-4 shadow-lg"
                      width={800}
                    />
                  ))}
              </Document>
            </div>
          )}

          {isUnsupported && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-500 dark:text-slate-400">
              <FileText className="h-16 w-16" />
              <p className="text-lg">No preview available</p>
              <button
                onClick={() => onDownload(file.storage_path, file.name)}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
