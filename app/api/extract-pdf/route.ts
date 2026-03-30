import { NextRequest, NextResponse } from "next/server";
import { extractFromPdf } from "@/lib/extract";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが選択されていません。" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const pages = await extractFromPdf(buffer);

    const text = pages
      .filter((p) => p.text.trim())
      .map((p) => `--- ページ ${p.page} ---\n${p.text}`)
      .join("\n\n");

    return NextResponse.json({ text });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "PDF解析中にエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
