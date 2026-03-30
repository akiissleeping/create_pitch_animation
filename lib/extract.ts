import JSZip from "jszip";

interface PageContent {
  page: number;
  text: string;
}

export async function extractFromPptx(buffer: Buffer): Promise<PageContent[]> {
  const zip = await JSZip.loadAsync(buffer);
  const pages: PageContent[] = [];

  const slideFiles: { index: number; file: JSZip.JSZipObject }[] = [];

  zip.forEach((relativePath, file) => {
    const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (match) {
      slideFiles.push({ index: parseInt(match[1], 10), file });
    }
  });

  slideFiles.sort((a, b) => a.index - b.index);

  for (const { index, file } of slideFiles) {
    const xml = await file.async("text");
    const text = xml
      .replace(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g, "$1 ")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    pages.push({ page: index, text });
  }

  return pages;
}

export async function extractContent(
  buffer: Buffer,
  filename: string
): Promise<PageContent[]> {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "pptx" || ext === "ppt") {
    return extractFromPptx(buffer);
  }

  throw new Error(`サポートされていないファイル形式: ${ext}。PPTXのみサーバーサイドで対応しています。`);
}
