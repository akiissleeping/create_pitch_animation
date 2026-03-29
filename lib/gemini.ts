const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Text generation: gemini-2.5-flash (stable, free tier available)
const TEXT_MODEL = "gemini-2.5-flash";
// Image generation: gemini-2.5-flash-image (stable image model)
const IMAGE_MODEL = "gemini-2.5-flash-image";

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key") {
    throw new Error("GEMINI_API_KEY が設定されていません。.env.local を確認してください。");
  }
  return apiKey;
}

/**
 * Retry wrapper for Gemini API calls with exponential backoff on 429 errors
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429 && attempt < maxRetries) {
      // Parse retry delay from response, default to exponential backoff
      let waitMs = Math.min(1000 * Math.pow(2, attempt + 1), 30000);
      try {
        const errData = await response.json();
        const retryInfo = errData.error?.details?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (d: any) => d["@type"]?.includes("RetryInfo")
        );
        if (retryInfo?.retryDelay) {
          const seconds = parseFloat(retryInfo.retryDelay);
          if (!isNaN(seconds)) {
            waitMs = Math.ceil(seconds * 1000) + 500;
          }
        }
      } catch {
        // ignore parse errors
      }

      console.log(`Rate limited. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    return response;
  }

  throw new Error("Gemini API: リトライ回数の上限に達しました。しばらく待ってから再試行してください。");
}

/**
 * Gemini APIでテキスト生成（プロンプト生成・ファイル分析用）
 */
export async function generateText(
  systemInstruction: string,
  userMessage: string
): Promise<string> {
  const apiKey = getApiKey();
  const url = `${GEMINI_BASE}/${TEXT_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetchWithRetry(url, {
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
  const url = `${GEMINI_BASE}/${IMAGE_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetchWithRetry(url, {
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
