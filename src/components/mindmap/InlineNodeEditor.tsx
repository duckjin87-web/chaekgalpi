import type { MindMapNodeData, NodeLevel } from "../../types";
import { bookmarkColors, nodeLevelOrder, nodeLevelStyle, randomBookmarkColor } from "../../theme";
import { useMindMapActions } from "./MindMapContext";

interface InlineNodeEditorProps {
  id: string;
  data: MindMapNodeData;
}

export default function InlineNodeEditor({ id, data }: InlineNodeEditorProps) {
  const { updateNodeData } = useMindMapActions();

  return (
    <div
      className="nodrag nopan nowheel absolute left-0 top-full z-20 mt-1.5 flex items-center gap-1.5 rounded-md bg-white/95 p-1.5 shadow-lg"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {bookmarkColors.map((color) => (
        <button
          key={color}
          onClick={() => updateNodeData(id, { color })}
          className={`h-5 w-5 rounded-full border-2 ${
            data.color === color ? "border-stone-800" : "border-transparent"
          }`}
          style={{ backgroundColor: color }}
          aria-label={color}
        />
      ))}
      <button
        onClick={() => updateNodeData(id, { color: randomBookmarkColor() })}
        className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-transparent bg-stone-100 text-xs"
        title="색상 랜덤"
      >
        🎲
      </button>
      <div className="mx-1 h-5 w-px bg-stone-200" />
      {nodeLevelOrder.map((level: NodeLevel) => (
        <button
          key={level}
          onClick={() => updateNodeData(id, { level })}
          className={`rounded border px-1.5 py-0.5 text-[11px] ${
            (data.level ?? "medium") === level
              ? "border-emerald-700 bg-emerald-50 font-medium text-emerald-800"
              : "border-stone-200 text-stone-500 hover:bg-stone-50"
          }`}
        >
          {nodeLevelStyle[level].label}
        </button>
      ))}
    </div>
  );
}
