"use client";

import { STYLE_LABELS, type AnimeStyle, type SlideData } from "@/lib/types";

interface SlideEditorProps {
  slide: SlideData;
  index: number;
  onUpdate: (id: string, fields: Partial<SlideData>) => void;
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => void;
}

export default function SlideEditor({
  slide,
  index,
  onUpdate,
  onDelete,
  onRegenerate,
}: SlideEditorProps) {
  const isGenerating = slide.status === "generating-prompt" || slide.status === "generating-image";

  return (
    <div className="animate-fade-in bg-dark-700 rounded-xl border border-dark-600 p-5 relative group hover:border-neon-blue/30 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-neon-blue/10 text-neon-blue font-display text-sm font-bold">
            {index + 1}
          </span>
          <h3 className="text-white/80 text-sm font-medium">
            スライド {index + 1}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {slide.status === "done" && (
            <button
              onClick={() => onRegenerate(slide.id)}
              className="text-xs px-3 py-1.5 rounded-lg bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 transition-colors"
            >
              再生成
            </button>
          )}
          {slide.status === "error" && (
            <button
              onClick={() => onRegenerate(slide.id)}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              リトライ
            </button>
          )}
          <button
            onClick={() => onDelete(slide.id)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="削除"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Topic */}
      <div className="mb-3">
        <label className="block text-xs text-white/50 mb-1.5">トピック</label>
        <input
          type="text"
          value={slide.topic}
          onChange={(e) => onUpdate(slide.id, { topic: e.target.value })}
          placeholder="例: 売上推移"
          disabled={isGenerating}
          className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/20 transition-colors disabled:opacity-50"
        />
      </div>

      {/* Content */}
      <div className="mb-3">
        <label className="block text-xs text-white/50 mb-1.5">含めたい内容</label>
        <textarea
          value={slide.content}
          onChange={(e) => onUpdate(slide.id, { content: e.target.value })}
          placeholder="例: 右肩上がりのグラフ、喜ぶビジネスマン"
          disabled={isGenerating}
          rows={3}
          className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/20 transition-colors resize-none disabled:opacity-50"
        />
      </div>

      {/* Style */}
      <div className="mb-3">
        <label className="block text-xs text-white/50 mb-1.5">イラストスタイル</label>
        <select
          value={slide.style}
          onChange={(e) => onUpdate(slide.id, { style: e.target.value as AnimeStyle })}
          disabled={isGenerating}
          className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/20 transition-colors disabled:opacity-50"
        >
          {(Object.entries(STYLE_LABELS) as [AnimeStyle, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom style input */}
      {slide.style === "custom" && (
        <div className="mb-3 animate-fade-in">
          <label className="block text-xs text-white/50 mb-1.5">カスタムスタイル</label>
          <input
            type="text"
            value={slide.customStyle}
            onChange={(e) => onUpdate(slide.id, { customStyle: e.target.value })}
            placeholder="例: レトロ80年代アニメ風、セル画タッチ"
            disabled={isGenerating}
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/20 transition-colors disabled:opacity-50"
          />
        </div>
      )}

      {/* Status indicator */}
      {isGenerating && (
        <div className="mt-3 flex items-center gap-2 text-xs text-neon-blue">
          <div className="w-3 h-3 rounded-full bg-neon-blue/30 animate-pulse" />
          {slide.status === "generating-prompt" ? "プロンプト生成中..." : "画像生成中..."}
        </div>
      )}

      {slide.status === "error" && slide.error && (
        <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {slide.error}
        </div>
      )}
    </div>
  );
}
