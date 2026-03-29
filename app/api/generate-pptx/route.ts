import { NextRequest, NextResponse } from "next/server";
import { createPptxBuffer } from "@/lib/pptx";
import type { GeneratePptxRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePptxRequest = await request.json();

    if (!body.slides || body.slides.length === 0) {
      return NextResponse.json(
        { error: "スライドが0枚です。" },
        { status: 400 }
      );
    }

    const pptxBuffer = await createPptxBuffer(body.slides);

    return new NextResponse(new Uint8Array(pptxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="anime_presentation.pptx"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PPTX生成中にエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
