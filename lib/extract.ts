import JSZip from "jszip";

interface PageContent {
  page: number;
  text: string;
}

async function loadPdfParse(): Promise<(buf: Buffer) => Promise<{ text: string }>> {
  // Avoid static analysis picking this up at build time
  const moduleName = ["pdf", "parse"].join("-");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(moduleName);
}

export async function extractFromPdf(buffer: Buffer): Promise<PageContent[]> {
  const pdf = await loadPdfParse();
  const data = await pdf(buffer);

  const pages: PageContent[] = [];
  const rawPages = data.text.split(/\f/);

  for (let i = 0; i < rawPages.length; i++) {
    const text = rawPages[i].trim();
    if (text) {
      pages.push({ page: i + 1, text });
    }
  }

  if (pages.length === 0 && data.text.trim()) {
    pages.push({ page: 1, text: data.text.trim() });
  }

  return pages;
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

  if (ext === "pdf") {
    return extractFromPdf(buffer);
  } else if (ext === "pptx" || ext === "ppt") {
    return extractFromPptx(buffer);
  }

  throw new Error(`サポートされていないファイル形式: ${ext}`);
}
