import { STYLE_PROMPTS, type AnimeStyle } from "./types";
import { generateText } from "./gemini";

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
  const styleText = style === "custom" ? customStyle : STYLE_PROMPTS[style];

  const userMessage = `トピック: ${topic}\n含めたい内容: ${content}\nスタイル: ${styleText}`;

  return generateText(SYSTEM_PROMPT, userMessage);
}
