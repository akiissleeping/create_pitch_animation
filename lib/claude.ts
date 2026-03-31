import { STYLE_PROMPTS, type AnimeStyle } from "./types";
import { generateText } from "./gemini";

const IMAGE_PROMPT_SYSTEM = `あなたはプレゼンテーション用イラストの画像生成プロンプトを作成する専門家です。
ユーザーからスライドのトピックと含めたい内容、スタイル指定を受け取り、
それを英語の画像生成プロンプトに変換してください。

重要なルール：
- プレゼンテーションのスライド背景として使える構図にしてください
- テキスト・文字・数字・ラベルは絶対に画像に含めないでください（テキストはPPTX側で追加します）
- スタイル指定が「graphic-recording」や「business-illustration」の場合は、以下を意識してください：
  - 手描き風のシンプルで親しみやすいキャラクター
  - ビジネスシーンのアイコンや視覚的メタファー（矢印、歯車、電球、チェックマークなど）
  - クリーム/ベージュの温かい背景色
  - パステルカラーのアクセント（水色、オレンジ、黄緑、ピンク）
  - グラフィックレコーディングやファシリテーショングラフィック風のレイアウト
  - 情報を視覚化するイラスト要素（Before→Afterの概念、カテゴリ分け、ステップなど）
- 出力はプロンプトのテキストのみ、余計な説明は不要です。`;

const BULLET_POINTS_SYSTEM = `あなたはプレゼンテーション資料の専門家です。
ユーザーからスライドのトピックと含めたい内容を受け取り、
スライドに表示する箇条書き（3つ）を生成してください。

ルール:
- 必ず3つの箇条書きを生成
- 各項目は日本語で20文字以内の簡潔な表現
- プレゼンの聴衆に伝わりやすい表現にする
- 出力は改行区切りの3行のみ、番号や記号は不要
- 余計な説明は不要です`;

export async function generateImagePrompt(
  topic: string,
  content: string,
  style: AnimeStyle,
  customStyle: string
): Promise<{ prompt: string; bulletPoints: string[] }> {
  const styleText = style === "custom" ? customStyle : STYLE_PROMPTS[style];
  const userMessage = `トピック: ${topic}\n含めたい内容: ${content}\nスタイル: ${styleText}`;
  const bulletUserMessage = `トピック: ${topic}\n含めたい内容: ${content}`;

  // Generate image prompt and bullet points in parallel
  const [prompt, bulletsRaw] = await Promise.all([
    generateText(IMAGE_PROMPT_SYSTEM, userMessage),
    generateText(BULLET_POINTS_SYSTEM, bulletUserMessage),
  ]);

  const bulletPoints = bulletsRaw
    .split("\n")
    .map((line) => line.replace(/^[\s・\-\d.]+/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 3);

  return { prompt, bulletPoints };
}
