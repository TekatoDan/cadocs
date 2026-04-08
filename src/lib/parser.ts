import * as pdfjsLib from "pdfjs-dist";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n\n";
    }

    return fullText.trim();
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF document.");
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    return extractTextFromPDF(file);
  }

  if (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    file.name.match(/\.(md|ts|js|json|html|css|csv|txt|jsx|tsx)$/i)
  ) {
    return await file.text();
  }

  throw new Error(
    `Text extraction for ${file.type} is not yet supported.`
  );
}
