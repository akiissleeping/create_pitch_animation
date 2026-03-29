"use client";

import { useState, useCallback } from "react";
import SlideList from "@/components/SlideList";
import SlidePreview from "@/components/SlidePreview";
import GenerateButton from "@/components/GenerateButton";
import FileUpload from "@/components/FileUpload";
import type { SlideData, AnimeStyle } from "@/lib/types";

function createSlide(): SlideData {
  return {
    id: crypto.randomUUID(),
    topic: "",
    content: "",
    style: "ghibli",
    customStyle: "",
    status: "idle",
  };
}

export default function Home() {
  const [slides, setSlides] = useState<SlideData[]>([createSlide()]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    phase: string;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [defaultStyle, setDefaultStyle] = useState<AnimeStyle>("ghibli");

  const handleFileAnalyzed = useCallback(
    (topics: { topic: string; content: string }[]) => {
      const newSlides: SlideData[] = topics.map((t) => ({
        id: crypto.randomUUID(),
        topic: t.topic,
        content: t.content,
        style: defaultStyle,
        customStyle: "",
        status: "idle" as const,
      }));
      setSlides(newSlides);
    },
    [defaultStyle]
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleAdd = useCallback(() => {
    setSlides((prev) => [...prev, createSlide()]);
  }, []);

  const handleUpdate = useCallback((id: string, fields: Partial<SlideData>) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...fields } : s))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setSlides((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      return filtered.length === 0 ? [createSlide()] : filtered;
    });
  }, []);

  const handleReorder = useCallback((from: number, to: number) => {
    setSlides((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }, []);

  const generateSingleSlide = async (slide: SlideData): Promise<SlideData> => {
    // Step 1: Generate prompt
    setSlides((prev) =>
      prev.map((s) =>
        s.id === slide.id ? { ...s, status: "generating-prompt" } : s
      )
    );

    const promptRes = await fetch("/api/generate-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: slide.topic,
        content: slide.content,
        style: slide.style,
        customStyle: slide.customStyle,
      }),
    });

    if (!promptRes.ok) {
      const err = await promptRes.json();
      throw new Error(err.error || "プロンプト生成に失敗しました");
    }

    const { prompt } = await promptRes.json();

    // Step 2: Generate image
    setSlides((prev) =>
      prev.map((s) =>
        s.id === slide.id
          ? { ...s, generatedPrompt: prompt, status: "generating-image" }
          : s
      )
    );

    const imageRes = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!imageRes.ok) {
      const err = await imageRes.json();
      throw new Error(err.error || "画像生成に失敗しました");
    }

    const { imageBase64 } = await imageRes.json();

    const updated: SlideData = {
      ...slide,
      generatedPrompt: prompt,
      imageBase64,
      status: "done",
      error: undefined,
    };

    setSlides((prev) => prev.map((s) => (s.id === slide.id ? updated : s)));
    return updated;
  };

  const handleGenerate = async () => {
    const validSlides = slides.filter((s) => s.topic || s.content);
    if (validSlides.length === 0) {
      showToast("少なくとも1つのスライドにトピックまたは内容を入力してください。");
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: validSlides.length, phase: "準備中" });

    for (let i = 0; i < validSlides.length; i++) {
      setProgress({
        current: i + 1,
        total: validSlides.length,
        phase: "プロンプト生成中",
      });

      try {
        await generateSingleSlide(validSlides[i]);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "エラーが発生しました";
        setSlides((prev) =>
          prev.map((s) =>
            s.id === validSlides[i].id
              ? { ...s, status: "error", error: msg }
              : s
          )
        );
        showToast(`スライド ${i + 1}: ${msg}`);
      }
    }

    setIsGenerating(false);
    setProgress(null);
  };

  const handleRegenerate = async (id: string) => {
    const slide = slides.find((s) => s.id === id);
    if (!slide) return;

    setIsGenerating(true);
    setProgress({ current: 1, total: 1, phase: "再生成中" });

    try {
      await generateSingleSlide(slide);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "エラーが発生しました";
      setSlides((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "error", error: msg } : s
        )
      );
      showToast(msg);
    }

    setIsGenerating(false);
    setProgress(null);
  };

  const handleDownload = async () => {
    const doneSlides = slides.filter((s) => s.status === "done" && s.imageBase64);
    if (doneSlides.length === 0) {
      showToast("ダウンロードする画像がありません。まずスライドを生成してください。");
      return;
    }

    try {
      const res = await fetch("/api/generate-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: doneSlides.map((s) => ({
            topic: s.topic,
            imageBase64: s.imageBase64,
            showTitle: true,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "PPTX生成に失敗しました");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "anime_presentation.pptx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "PPTX生成に失敗しました";
      showToast(msg);
    }
  };

  const hasCompletedSlides = slides.some((s) => s.status === "done" && s.imageBase64);

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl text-sm max-w-sm shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-dark-700 bg-dark-800/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-wider">
              <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
                ANIME SLIDE
              </span>{" "}
              <span className="text-white/80">GENERATOR</span>
            </h1>
            <p className="text-xs text-white/40 mt-0.5">
              AIがあなたのプレゼンをアニメ風に変換
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-white/30">
            <div className="w-2 h-2 rounded-full bg-green-500/50" />
            Powered by Claude + Gemini
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left: Slide input */}
          <div className="space-y-5">
            {/* File Upload */}
            <div className="space-y-3">
              <h2 className="text-lg font-medium text-white/80">
                資料からインポート
              </h2>
              <FileUpload
                onAnalyzed={handleFileAnalyzed}
                disabled={isGenerating}
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-dark-600" />
              <span className="text-xs text-white/30">または手動入力</span>
              <div className="flex-1 h-px bg-dark-600" />
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white/80">
                スライド入力
              </h2>
              <span className="text-xs text-white/30">{slides.length} 枚</span>
            </div>

            <SlideList
              slides={slides}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAdd={handleAdd}
              onRegenerate={handleRegenerate}
              onReorder={handleReorder}
            />
          </div>

          {/* Right: Preview & Controls */}
          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-lg font-medium text-white/80">
              プレビュー
            </h2>

            <GenerateButton
              onClick={handleGenerate}
              disabled={isGenerating || slides.every((s) => !s.topic && !s.content)}
              isGenerating={isGenerating}
              progress={progress}
            />

            <SlidePreview slides={slides} />

            {hasCompletedSlides && (
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full py-3 rounded-xl font-medium text-sm bg-dark-700 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/10 hover:border-neon-purple/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3V12M9 12L5 8M9 12L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 15H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                PPTXをダウンロード
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
