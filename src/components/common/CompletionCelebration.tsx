import { useEffect, useMemo } from "react";

interface CompletionCelebrationProps {
  title: string;
  onDone: () => void;
  durationMs?: number;
}

const EMOJIS = ["🎉", "✨", "📖", "🎊", "🏆", "🌟", "🎈", "💫"];

export default function CompletionCelebration({
  title,
  onDone,
  durationMs = 2400,
}: CompletionCelebrationProps) {
  useEffect(() => {
    const t = window.setTimeout(onDone, durationMs);
    return () => window.clearTimeout(t);
  }, [onDone, durationMs]);

  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.6,
        drift: (Math.random() - 0.5) * 40,
        size: 22 + Math.random() * 22,
        emoji: EMOJIS[i % EMOJIS.length],
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[10000] overflow-hidden">
      <div className="absolute inset-0 animate-[celebrate-bg_2.4s_ease-out_forwards] bg-black/45" />

      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-[-40px] block animate-[float-up_2.4s_ease-out_forwards]"
          style={{
            left: `${p.x}%`,
            fontSize: p.size,
            animationDelay: `${p.delay}s`,
            // @ts-expect-error CSS custom property for keyframes
            "--drift": `${p.drift}px`,
          }}
        >
          {p.emoji}
        </span>
      ))}

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
        <p className="animate-[pop-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_forwards] text-center font-serif text-6xl font-black tracking-tight text-white opacity-0 drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          🎉 완독!
        </p>
        <p className="animate-[pop-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_0.15s_forwards] max-w-[80%] text-center font-serif text-lg text-white/95 opacity-0">
          「{title}」
        </p>
        <p className="mt-2 animate-[pop-in_0.5s_ease-out_0.4s_forwards] text-center text-xs tracking-[0.3em] text-white/70 opacity-0">
          독후감으로 이동합니다…
        </p>
      </div>
    </div>
  );
}
