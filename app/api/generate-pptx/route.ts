import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { writeFile, readFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import type { GeneratePptxRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  let tempDir = "";
  try {
    const body: GeneratePptxRequest = await request.json();

    if (!body.slides || body.slides.length === 0) {
      return NextResponse.json(
        { error: "スライドが0枚です。" },
        { status: 400 }
      );
    }

    tempDir = await mkdtemp(join(tmpdir(), "anime-pptx-"));
    const outputPath = join(tempDir, "presentation.pptx");

    // Save images to temp files and build slide data for Python
    const slideInfos = [];
    for (let i = 0; i < body.slides.length; i++) {
      const slide = body.slides[i];
      const imgPath = join(tempDir, `slide_${i}.png`);
      const imgBuffer = Buffer.from(slide.imageBase64, "base64");
      await writeFile(imgPath, imgBuffer);
      slideInfos.push({
        image_path: imgPath,
        topic: slide.topic,
        show_title: slide.showTitle,
      });
    }

    const jsonData = JSON.stringify({
      slides: slideInfos,
      output_path: outputPath,
    });

    const jsonPath = join(tempDir, "input.json");
    await writeFile(jsonPath, jsonData, "utf-8");

    const scriptPath = join(process.cwd(), "scripts", "create_pptx.py");

    await new Promise<void>((resolve, reject) => {
      execFile("python", [scriptPath, jsonPath], { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`PPTX生成エラー: ${stderr || error.message}`));
        } else {
          resolve();
        }
      });
    });

    const pptxBuffer = await readFile(outputPath);

    // Cleanup temp files
    const cleanups = [unlink(jsonPath), unlink(outputPath)];
    for (let i = 0; i < body.slides.length; i++) {
      cleanups.push(unlink(join(tempDir, `slide_${i}.png`)));
    }
    await Promise.allSettled(cleanups);

    return new NextResponse(pptxBuffer, {
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
