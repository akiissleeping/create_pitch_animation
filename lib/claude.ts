import { STYLE_PROMPTS, type AnimeStyle } from "./types";

const SYSTEM_PROMPT = `あなたはアニメ風イラストの画像生成プロンプトを作成する専門家です。
ユーザーからスライドのトピックと含めたい内容を受け取り、
それを英語の画像生成プロンプトに変換してください。
プレゼンテーションのスライドとして使える構図にしてください。
テキストは画像に含めないでください（テキストはPPTX側で追加します）。
出力はプロンプトのテキストのみ、余計な説明は不要です。`;

export async function generateImagePrompt(
  topic: string,
  content: string,
  style: AnimeStyle,
  customStyle: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_anthropic_api_key") {
    throw new Error("ANTHROPIC_API_KEY が設定されていません。.env.local を確認してください。");
  }

  const styleText = style === "custom" ? customStyle : STYLE_PROMPTS[style];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `トピック: ${topic}\n含めたい内容: ${content}\nスタイル: ${styleText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Claude API エラー: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) {
    throw new Error("Claude API からプロンプトを取得できませんでした。");
  }

  return text.trim();
}
