import type { MindMapNodeData, NodeLevel } from "../../types";
import { nodeLevelOrder, nodeLevelStyle } from "../../theme";
import { useLibraryStore } from "../../store/useLibraryStore";
import { useMindMapActions } from "./MindMapContext";

/** 글 앞에 붙이는 마커 (우선순위 · 상태 표시) */
const MARKERS = ["⭐", "❗", "❓", "💡", "✅", "📌", "1️⃣", "2️⃣", "3️⃣"];

interface InlineNodeEditorProps {
  id: string;
  data: MindMapNodeData;
}

export default function InlineNodeEditor({ id, data }: InlineNodeEditorProps) {
  const { updateNodeData } = useMindMapActions();
  const palette = useLibraryStore((s) => s.bookmarkPalette);
  const reshufflePalette = useLibraryStore((s) => s.reshuffleBookmarkPalette);

  return (
    <div
      className="nodrag nopan nowheel absolute left-1/2 top-full z-20 mt-3 flex -translate-x-1/2 flex-col gap-1.5 rounded-2xl border border-white/40 bg-white/80 px-3 py-2 shadow-xl backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          {palette.map((color) => (
            <button
              key={color}
              onClick={() => updateNodeData(id, { color })}
              className={`h-5 w-5 rounded-full ring-2 transition-transform hover:scale-110 ${
                data.color === color ? "ring-stone-700" : "ring-transparent"
              }`}
              style={{ backgroundColor: color }}
              aria-label={color}
            />
          ))}
          <button
            onClick={reshufflePalette}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100/80 text-[11px] text-stone-600 transition-transform hover:rotate-180 hover:bg-stone-200"
            title="기본 색상 5가지 랜덤 재배치"
          >
            ↻
          </button>
        </div>
        <div className="h-5 w-px bg-stone-300/60" />
        <div className="flex items-center gap-1">
          {nodeLevelOrder.map((level: NodeLevel) => (
            <button
              key={level}
              onClick={() => updateNodeData(id, { level })}
              className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] transition-colors ${
                (data.level ?? "medium") === level
                  ? "bg-emerald-700/90 font-medium text-white"
                  : "bg-stone-100/70 text-stone-500 hover:bg-stone-200/80"
              }`}
            >
              {nodeLevelStyle[level].label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-0.5 border-t border-stone-200/70 pt-1.5">
        {MARKERS.map((m) => (
          <button
            key={m}
            onClick={() => updateNodeData(id, { marker: data.marker === m ? undefined : m })}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-sm transition-transform active:scale-90 ${
              data.marker === m ? "bg-emerald-100 ring-1 ring-emerald-600" : ""
            }`}
            title={data.marker === m ? "마커 지우기" : "마커 붙이기"}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
