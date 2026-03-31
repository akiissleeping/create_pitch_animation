export type AnimeStyle =
  | "graphic-recording"
  | "business-illustration"
  | "ghibli"
  | "shinkai"
  | "cyberpunk"
  | "pop"
  | "watercolor"
  | "custom";

export const STYLE_LABELS: Record<AnimeStyle, string> = {
  "graphic-recording": "グラレコ風（おすすめ）",
  "business-illustration": "ビジネスイラスト風",
  ghibli: "ジブリ風",
  shinkai: "新海誠風",
  cyberpunk: "サイバーパンク",
  pop: "ポップ・カラフル",
  watercolor: "水彩画風",
  custom: "カスタム",
};

export const STYLE_PROMPTS: Record<AnimeStyle, string> = {
  "graphic-recording": "Hand-drawn graphic recording style illustration for a business presentation slide. Warm cream/beige background. Simple cute cartoon business people with friendly round faces. Small colorful icons and visual metaphors. Soft pastel accent colors (light blue, light orange, light green, light pink). Sketch-like pen outlines with watercolor fill. Clean whitespace. Infographic layout feel. No text or letters in the image. Japanese business presentation aesthetic similar to graphic facilitation art.",
  "business-illustration": "Clean professional business illustration style. Simple friendly cartoon characters in business attire. Flat design with soft shadows. Light warm background. Colorful but not overwhelming icons and diagrams. Modern corporate presentation aesthetic. Rounded shapes, approachable feel. No text or letters in the image.",
  ghibli: "Studio Ghibli style, soft watercolor textures, warm pastoral colors, Hayao Miyazaki aesthetic",
  shinkai: "Makoto Shinkai style, photorealistic backgrounds, dramatic lighting, vibrant sky gradients, lens flare",
  cyberpunk: "cyberpunk anime style, neon lights, dark urban environment, holographic elements, futuristic",
  pop: "colorful pop art anime style, bright vivid colors, bold outlines, energetic composition, kawaii aesthetic",
  watercolor: "Japanese watercolor anime style, soft brush strokes, delicate washes, muted elegant palette",
  custom: "",
};

export interface SlideData {
  id: string;
  topic: string;
  content: string;
  style: AnimeStyle;
  customStyle: string;
  generatedPrompt?: string;
  bulletPoints?: string[];
  imageBase64?: string;
  status: "idle" | "generating-prompt" | "generating-image" | "done" | "error";
  error?: string;
}

export interface GeneratePromptRequest {
  topic: string;
  content: string;
  style: AnimeStyle;
  customStyle: string;
}

export interface GeneratePromptResponse {
  prompt: string;
  bulletPoints: string[];
}

export interface GenerateImageRequest {
  prompt: string;
}

export interface GenerateImageResponse {
  imageBase64: string;
}

export interface GeneratePptxRequest {
  slides: {
    topic: string;
    imageBase64: string;
    showTitle: boolean;
  }[];
}

export interface ExtractedTopic {
  topic: string;
  content: string;
}

export interface AnalyzeFileResponse {
  topics: ExtractedTopic[];
}
