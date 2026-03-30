import { NextRequest, NextResponse } from "next/server";
import { generateImagePrompt } from "@/lib/claude";
import type { GeneratePromptRequest, GeneratePromptResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePromptRequest = await request.json();

    if (!body.topic && !body.content) {
      return NextResponse.json(
        { error: "トピックまたは含めたい内容を入力してください。" },
        { status: 400 }
      );
    }

    const { prompt, bulletPoints } = await generateImagePrompt(
      body.topic,
      body.content,
      body.style,
      body.customStyle
    );

    const response: GeneratePromptResponse = { prompt, bulletPoints };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "プロンプト生成中にエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
