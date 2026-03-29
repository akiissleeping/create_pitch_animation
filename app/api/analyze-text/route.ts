import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";
import type { AnalyzeFileResponse } from "@/lib/types";

const SYSTEM_PROMPT = `あなたはプレゼンテーション資料を分析する専門家です。
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
  try {
    const body = await request.json();
    const { text, fileName } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "ファイルからテキストを抽出できませんでした。画像のみのPDFには対応していません。" },
        { status: 400 }
      );
    }

    // Truncate if too long
    const truncatedText =
      text.length > 30000 ? text.slice(0, 30000) + "\n\n...(以下省略)" : text;

    const userMessage = `以下の資料の内容を分析して、重要なトピックを洗い出してください。\n\nファイル名: ${fileName || "unknown"}\n\n${truncatedText}`;

    const responseText = await generateText(SYSTEM_PROMPT, userMessage);

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
