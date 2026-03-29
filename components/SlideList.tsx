"use client";

import { useCallback } from "react";
import SlideEditor from "./SlideEditor";
import type { SlideData } from "@/lib/types";

interface SlideListProps {
  slides: SlideData[];
  onUpdate: (id: string, fields: Partial<SlideData>) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onRegenerate: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export default function SlideList({
  slides,
  onUpdate,
  onDelete,
  onAdd,
  onRegenerate,
  onReorder,
}: SlideListProps) {
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
      if (fromIndex !== toIndex) {
        onReorder(fromIndex, toIndex);
      }
    },
    [onReorder]
  );

  return (
    <div className="space-y-4">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
          className="cursor-grab active:cursor-grabbing"
        >
          <SlideEditor
            slide={slide}
            index={index}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onRegenerate={onRegenerate}
          />
        </div>
      ))}

      <button
        onClick={onAdd}
        className="w-full py-4 border-2 border-dashed border-dark-600 rounded-xl text-white/40 hover:border-neon-blue/40 hover:text-neon-blue/60 transition-colors flex items-center justify-center gap-2 group"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="group-hover:scale-110 transition-transform">
          <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="text-sm font-medium">スライドを追加</span>
      </button>
    </div>
  );
}
