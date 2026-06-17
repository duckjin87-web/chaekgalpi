import type { MindMapNodeData, MindNodeKind, NodeLevel } from "../../types";
import { bookmarkColors, memoColors, nodeLevelOrder, nodeLevelStyle } from "../../theme";
import { useMindMapActions } from "./MindMapContext";

interface InlineNodeEditorProps {
  id: string;
  type: MindNodeKind;
  data: MindMapNodeData;
}

export default function InlineNodeEditor({ id, type, data }: InlineNodeEditorProps) {
  const { updateNodeData, deleteNode, clearSelection } = useMindMapActions();
  const isMemo = type === "memo";

  return (
    <div
      className="nodrag nopan nowheel absolute left-0 top-full z-20 mt-2 w-56 space-y-2.5 rounded-md border border-stone-300 bg-white p-3 text-left shadow-xl"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-700">
          {isMemo ? "메모 편집" : "노드 편집"}
        </span>
        <button onClick={clearSelection} className="text-stone-400 hover:text-stone-700">
          ✕
        </button>
      </div>

      {/* 주제 단계 (bookmark 전용) */}
      {!isMemo && (
        <div>
          <label className="block text-[11px] font-medium text-stone-500">주제 단계</label>
          <div className="mt-1 grid grid-cols-4 gap-1">
            {nodeLevelOrder.map((level: NodeLevel) => (
              <button
                key={level}
                onClick={() => updateNodeData(id, { level })}
                className={`rounded border px-1 py-1 text-[11px] ${
                  (data.level ?? "medium") === level
                    ? "border-emerald-700 bg-emerald-50 font-medium text-emerald-800"
                    : "border-stone-200 text-stone-500 hover:bg-stone-50"
                }`}
              >
                {nodeLevelStyle[level].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 메모 글자 크기 */}
      {isMemo && (
        <div>
          <label className="block text-[11px] font-medium text-stone-500">
            글자 크기 ({data.fontSize ?? 14}px)
          </label>
          <input
            type="range"
            min={10}
            max={32}
            value={data.fontSize ?? 14}
            onChange={(e) => updateNodeData(id, { fontSize: Number(e.target.value) })}
            className="mt-1 w-full"
          />
        </div>
      )}

      {/* 색상 */}
      <div>
        <label className="block text-[11px] font-medium text-stone-500">색상</label>
        <div className="mt-1 flex gap-1">
          {(isMemo ? memoColors : bookmarkColors).map((color) => (
            <button
              key={color}
              onClick={() => updateNodeData(id, { color })}
              className={`h-6 w-6 rounded-full border-2 ${
                data.color === color ? "border-stone-800" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
              aria-label={color}
            />
          ))}
        </div>
      </div>

      <button
        onClick={() => deleteNode(id)}
        className="w-full rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
      >
        {isMemo ? "메모 삭제" : "노드 삭제"}
      </button>
    </div>
  );
}
