"use client";

import { useState, useRef, useCallback } from "react";
import { extractTextFromFile } from "@/lib/extract-client";

interface FileUploadProps {
  onAnalyzed: (topics: { topic: string; content: string }[]) => void;
  disabled: boolean;
}

export default function FileUpload({ onAnalyzed, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["pdf", "pptx", "ppt"].includes(ext)) {
        setError("PDF または PPTX ファイルのみ対応しています。");
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        setError("ファイルサイズは100MB以下にしてください。");
        return;
      }

      setFileName(file.name);
      setError(null);
      setIsAnalyzing(true);

      try {
        // Step 1: Extract text client-side (no upload needed)
        setStatus("テキストを抽出中...");
        const text = await extractTextFromFile(file);

        if (!text.trim()) {
          throw new Error(
            "ファイルからテキストを抽出できませんでした。画像のみのPDFには対応していません。"
          );
        }

        // Step 2: Send only the text to the API for Claude analysis
        setStatus("AIでトピックを分析中...");
        const res = await fetch("/api/analyze-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text,
            fileName: file.name,
          }),
        });

        if (!res.ok) {
          const respText = await res.text();
          let errMsg = "ファイル分析に失敗しました";
          try {
            const errJson = JSON.parse(respText);
            errMsg = errJson.error || errMsg;
          } catch {
            errMsg = respText || errMsg;
          }
          throw new Error(errMsg);
        }

        const data = await res.json();
        onAnalyzed(data.topics);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "エラーが発生しました";
        setError(msg);
      } finally {
        setIsAnalyzing(false);
        setStatus("");
      }
    },
    [onAnalyzed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile]
  );

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !isAnalyzing && inputRef.current?.click()}
        className={`
          relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all
          ${
            isAnalyzing
              ? "border-neon-blue/40 bg-neon-blue/5 cursor-wait"
              : isDragging
              ? "border-neon-purple/60 bg-neon-purple/10 scale-[1.01]"
              : disabled
              ? "border-dark-600 bg-dark-800/50 cursor-not-allowed opacity-50"
              : "border-dark-600 bg-dark-800/30 hover:border-neon-blue/30 hover:bg-dark-700/50"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.pptx,.ppt"
          onChange={handleChange}
          disabled={disabled || isAnalyzing}
          className="hidden"
        />

        {isAnalyzing ? (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-neon-blue/30 border-t-neon-blue animate-spin" />
            </div>
            <div>
              <p className="text-sm text-neon-blue font-medium">{status || "分析中..."}</p>
              <p className="text-xs text-white/40 mt-1">
                {fileName} を処理しています
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                className="text-white/20"
              >
                <path
                  d="M20 6L20 26M20 6L13 13M20 6L27 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 24V30C6 32.2091 7.79086 34 10 34H30C32.2091 34 34 32.2091 34 30V24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-white/60">
                <span className="text-neon-blue font-medium">
                  PPT / PDF をアップロード
                </span>
                　またはドラッグ＆ドロップ
              </p>
              <p className="text-xs text-white/30 mt-1">
                AIが内容を分析し、トピックを自動で抽出します
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="animate-fade-in p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="mt-0.5 flex-shrink-0"
          >
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="10.5" r="0.75" fill="currentColor" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Success hint */}
      {fileName && !isAnalyzing && !error && (
        <div className="animate-fade-in flex items-center gap-2 text-xs text-green-400/70">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4.5 7L6.5 9L9.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{fileName} を分析済み</span>
        </div>
      )}
    </div>
  );
}
