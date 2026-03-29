"use client";

interface GenerateButtonProps {
  onClick: () => void;
  disabled: boolean;
  isGenerating: boolean;
  progress: { current: number; total: number; phase: string } | null;
}

export default function GenerateButton({
  onClick,
  disabled,
  isGenerating,
  progress,
}: GenerateButtonProps) {
  return (
    <div className="space-y-3">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          w-full py-4 rounded-xl font-display font-bold text-base tracking-wider uppercase transition-all
          ${
            isGenerating
              ? "bg-neon-blue/20 text-neon-blue cursor-wait animate-pulse-glow"
              : disabled
              ? "bg-dark-600 text-white/20 cursor-not-allowed"
              : "bg-gradient-to-r from-neon-blue to-neon-purple text-white hover:shadow-lg hover:shadow-neon-blue/30 hover:scale-[1.02] active:scale-[0.98]"
          }
        `}
      >
        {isGenerating ? "生成中..." : "スライドを生成"}
      </button>

      {/* Progress bar */}
      {isGenerating && progress && (
        <div className="space-y-2">
          <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-blue to-neon-purple rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-xs text-white/50 text-center">
            スライド {progress.current}/{progress.total} - {progress.phase}
          </p>
        </div>
      )}
    </div>
  );
}
