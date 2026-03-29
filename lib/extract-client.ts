/**
 * Client-side text extraction from PDF and PPTX files.
 * This avoids uploading large binary files to the server.
 */

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return extractTextFromPdf(file);
  } else if (ext === "pptx" || ext === "ppt") {
    return extractTextFromPptx(file);
  }

  throw new Error("PDF または PPTX ファイルのみ対応しています。");
}

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  // Disable worker to avoid CDN fetch issues in production
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ("str" in item ? item.str : "") as string)
      .join(" ");
    if (pageText.trim()) {
      pages.push(`--- ページ ${i} ---\n${pageText}`);
    }
  }

  return pages.join("\n\n");
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
