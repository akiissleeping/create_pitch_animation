"use client";

import type { SlideData } from "@/lib/types";

interface SlidePreviewProps {
  slides: SlideData[];
}

export default function SlidePreview({ slides }: SlidePreviewProps) {
  const completedSlides = slides.filter((s) => s.status === "done" && s.imageBase64);

  if (completedSlides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/30">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mb-4 opacity-30">
          <rect x="8" y="12" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="2" />
          <path d="M8 20H56" stroke="currentColor" strokeWidth="2" />
          <circle cx="20" cy="34" r="6" stroke="currentColor" strokeWidth="2" />
          <path d="M32 40L40 30L52 44H12L20 34" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <p className="text-sm">生成されたスライドがここに表示されます</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {completedSlides.map((slide, i) => (
        <div
          key={slide.id}
          className="animate-fade-in group relative aspect-video rounded-xl overflow-hidden border border-dark-600 hover:border-neon-blue/40 transition-all hover:shadow-lg hover:shadow-neon-blue/10"
        >
          <img
            src={`data:image/png;base64,${slide.imageBase64}`}
            alt={slide.topic || `スライド ${i + 1}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-sm font-medium truncate">
              {slide.topic || `スライド ${i + 1}`}
            </p>
          </div>
          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-md px-2 py-0.5 text-xs text-white/70">
            {i + 1}
          </div>
        </div>
      ))}
    </div>
  );
}
