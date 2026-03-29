import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { writeFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import type { AnalyzeFileResponse } from "@/lib/types";

const CLAUDE_SYSTEM_PROMPT = `あなたはプレゼンテーション資料を分析する専門家です。
アップロードされた資料（PDFまたはPPTX）のテキスト内容を受け取り、
プレゼンテーションの重要なトピックを洗い出し、各トピックの概要をまとめてください。

以下のJSON形式で出力してください。余計な説明は不要です。JSONのみ出力してください。
{
  "topics": [
    {
      "topic": "トピック名（短く簡潔に）",
      "content": "そのトピックの概要・含めるべき視覚的要素の説明（アニメ風イラストにする際に参考になる内容）"
    }
  ]
}

注意事項:
- トピック数は3〜8個程度に絞ってください
- 各トピックの概要は、アニメ風のイラストに変換する際にイメージしやすい表現にしてください
- 数値データやグラフがある場合は、視覚的な表現に置き換えてください
  （例：「売上が右肩上がり」→「成長を象徴する上昇する矢印、喜ぶキャラクター」）
- 抽象的な概念は具体的なシーンに変換してください
  （例：「チームワーク」→「仲間と一緒に協力するキャラクターたち」）`;

export async function POST(request: NextRequest) {
  let tempDir = "";

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが選択されていません。" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "pptx", "ppt"].includes(ext)) {
      return NextResponse.json(
        { error: "PDF または PPTX ファイルのみ対応しています。" },
        { status: 400 }
      );
    }

    // Save uploaded file to temp
    tempDir = await mkdtemp(join(tmpdir(), "anime-extract-"));
    const filePath = join(tempDir, `upload.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Extract text using Python script
    const scriptPath = join(process.cwd(), "scripts", "extract_content.py");
    const extractedText = await new Promise<string>((resolve, reject) => {
      execFile(
        "python",
        [scriptPath, filePath],
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`テキスト抽出エラー: ${stderr || error.message}`));
          } else {
            resolve(stdout);
          }
        }
      );
    });

    // Cleanup temp file
    await unlink(filePath).catch(() => {});

    const pages: { page: number; text: string }[] = JSON.parse(extractedText);
    const allText = pages
      .filter((p) => p.text.trim())
      .map((p) => `--- ページ ${p.page} ---\n${p.text}`)
      .join("\n\n");

    if (!allText.trim()) {
      return NextResponse.json(
        { error: "ファイルからテキストを抽出できませんでした。画像のみのPDFには対応していません。" },
        { status: 400 }
      );
    }

    // Truncate if too long (Claude context limit consideration)
    const truncatedText =
      allText.length > 30000 ? allText.slice(0, 30000) + "\n\n...(以下省略)" : allText;

    // Call Claude API to analyze and extract topics
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your_anthropic_api_key") {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY が設定されていません。" },
        { status: 500 }
      );
    }

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: CLAUDE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `以下の資料の内容を分析して、重要なトピックを洗い出してください。\n\nファイル名: ${file.name}\n\n${truncatedText}`,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.text();
      throw new Error(`Claude API エラー: ${claudeResponse.status} - ${errorData}`);
    }

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content?.[0]?.text;

    if (!responseText) {
      throw new Error("Claude API から応答を取得できませんでした。");
    }

    // Parse JSON from Claude's response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AIの応答からトピックを解析できませんでした。");
    }

    const parsed: AnalyzeFileResponse = JSON.parse(jsonMatch[0]);

    if (!parsed.topics || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
      throw new Error("トピックを抽出できませんでした。");
    }

    return NextResponse.json(parsed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ファイル分析中にエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
