const GEMINI_TEXT_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const GEMINI_IMAGE_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-image-generation:generateContent";

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key") {
    throw new Error("GEMINI_API_KEY が設定されていません。.env.local を確認してください。");
  }
  return apiKey;
}

/**
 * Gemini APIでテキスト生成（プロンプト生成・ファイル分析用）
 */
export async function generateText(
  systemInstruction: string,
  userMessage: string
): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(`${GEMINI_TEXT_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Gemini API エラー: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini API からテキストを取得できませんでした。");
  }

  return text.trim();
}

/**
 * Gemini APIでアニメ風画像を生成
 */
export async function generateAnimeImage(prompt: string): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(`${GEMINI_IMAGE_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Generate an anime-style illustration for a presentation slide. No text or letters in the image. ${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Gemini API エラー: ${response.status} - ${errorData}`);
  }

  const data = await response.json();

  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("Gemini API から画像を取得できませんでした。");
  }

  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith("image/")) {
      return part.inlineData.data;
    }
  }

  throw new Error("Gemini API のレスポンスに画像が含まれていませんでした。");
}
