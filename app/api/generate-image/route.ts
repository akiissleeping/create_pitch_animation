import { NextRequest, NextResponse } from "next/server";
import { generateAnimeImage } from "@/lib/gemini";
import type { GenerateImageRequest, GenerateImageResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json();

    if (!body.prompt) {
      return NextResponse.json(
        { error: "プロンプトが空です。" },
        { status: 400 }
      );
    }

    const imageBase64 = await generateAnimeImage(body.prompt);

    const response: GenerateImageResponse = { imageBase64 };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "画像生成中にエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
