/**
 * Client-side text extraction from PDF and PPTX files.
 * Uses unpdf (no worker) for PDF and jszip for PPTX.
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
  const { extractText } = await import("unpdf");

  const arrayBuffer = await file.arrayBuffer();
  const result = await extractText(new Uint8Array(arrayBuffer), { mergePages: false });

  const pages: string[] = [];
  // result.text is string[] when mergePages is false
  const textArray = result.text;
  if (Array.isArray(textArray)) {
    for (let i = 0; i < textArray.length; i++) {
      const pageText = textArray[i]?.trim();
      if (pageText) {
        pages.push(`--- ページ ${i + 1} ---\n${pageText}`);
      }
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

  while (true) {
    const slideFile = zip.file(`ppt/slides/slide${slideIndex}.xml`);
    if (!slideFile) break;

    const xml = await slideFile.async("text");
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
