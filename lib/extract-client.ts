/**
 * Client-side text extraction from PPTX files using jszip.
 * PDF files are sent to the server-side API for extraction (avoids pdf.js worker issues).
 */

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    // PDF: send to server API to avoid pdf.js worker issues in browser
    return extractTextFromPdfViaServer(file);
  } else if (ext === "pptx" || ext === "ppt") {
    // PPTX: extract client-side with jszip (no worker needed)
    return extractTextFromPptx(file);
  }

  throw new Error("PDF または PPTX ファイルのみ対応しています。");
}

async function extractTextFromPdfViaServer(file: File): Promise<string> {
  // Split file into chunks if needed to avoid Vercel 4.5MB payload limit
  const MAX_CHUNK = 4 * 1024 * 1024; // 4MB safe limit

  if (file.size > MAX_CHUNK) {
    // For large PDFs, read first 4MB only (covers most text-based PDFs)
    // The server will extract as much text as possible
    const blob = file.slice(0, MAX_CHUNK);
    const formData = new FormData();
    formData.append("file", blob, file.name);

    const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "PDF解析に失敗しました" }));
      throw new Error(err.error || "PDF解析に失敗しました");
    }
    const data = await res.json();
    return data.text || "";
  }

  const formData = new FormData();
  formData.append("file", file, file.name);

  const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "PDF解析に失敗しました" }));
    throw new Error(err.error || "PDF解析に失敗しました");
  }
  const data = await res.json();
  return data.text || "";
}

async function extractTextFromPptx(file: File): Promise<string> {
  const JSZip = (await import("jszip")).default;

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const pages: string[] = [];
  let slideIndex = 1;

  // PPTX files contain slides in ppt/slides/slide{n}.xml
  while (true) {
    const slideFile = zip.file(`ppt/slides/slide${slideIndex}.xml`);
    if (!slideFile) break;

    const xml = await slideFile.async("text");
    // Extract text from XML by removing all tags
    const text = xml
      .replace(/<a:t>/g, "|||TEXT_START|||")
      .replace(/<\/a:t>/g, "|||TEXT_END|||")
      .replace(/<[^>]+>/g, "")
      .split("|||TEXT_START|||")
      .slice(1)
      .map((s) => s.split("|||TEXT_END|||")[0])
      .join(" ")
      .trim();

    if (text) {
      pages.push(`--- スライド ${slideIndex} ---\n${text}`);
    }
    slideIndex++;
  }

  return pages.join("\n\n");
}
