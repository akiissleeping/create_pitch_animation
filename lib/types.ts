export type AnimeStyle =
  | "ghibli"
  | "shinkai"
  | "cyberpunk"
  | "pop"
  | "watercolor"
  | "custom";

export const STYLE_LABELS: Record<AnimeStyle, string> = {
  ghibli: "ジブリ風",
  shinkai: "新海誠風",
  cyberpunk: "サイバーパンク",
  pop: "ポップ・カラフル",
  watercolor: "水彩画風",
  custom: "カスタム",
};

export const STYLE_PROMPTS: Record<AnimeStyle, string> = {
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
