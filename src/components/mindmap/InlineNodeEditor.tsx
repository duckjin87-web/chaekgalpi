import type { ChangeEvent } from "react";
import type { MindMapNodeData, MindNodeKind, NodeAttachment, NodeLevel } from "../../types";
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

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const attachment: NodeAttachment = {
        id: crypto.randomUUID(),
        url: String(reader.result),
        name: file.name,
      };
      updateNodeData(id, { attachments: [...data.attachments, attachment] });
    };
    reader.readAsDataURL(file);
  }

  function removeAttachment(attachmentId: string) {
    updateNodeData(id, { attachments: data.attachments.filter((a) => a.id !== attachmentId) });
  }

  return (
    <div
      className="nodrag nopan nowheel absolute left-0 top-full z-20 mt-2 max-h-[320px] w-64 space-y-2.5 overflow-y-auto rounded-md border border-stone-300 bg-white p-3 text-left shadow-xl"
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

      {/* 기능 3: 대/중/소 주제 구분 (bookmark 전용) */}
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

      {/* 기능 4: 메모 폰트 크기 */}
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
          <p className="text-[10px] text-stone-400">크기는 메모 모서리를 드래그해서 조절하세요.</p>
        </div>
      )}

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

      {!isMemo && (
        <>
          <div>
            <label className="block text-[11px] font-medium text-stone-500">메모</label>
            <textarea
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
              rows={3}
              value={data.memo}
              onChange={(e) => updateNodeData(id, { memo: e.target.value })}
              placeholder="이 노드에 대한 생각을 적어보세요."
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-stone-500">이미지 첨부</label>
            <input type="file" accept="image/*" onChange={handleFile} className="mt-1 text-xs" />
            <div className="mt-2 flex flex-wrap gap-2">
              {data.attachments.map((a) => (
                <div key={a.id} className="relative h-14 w-14">
                  <img src={a.url} alt={a.name} className="h-full w-full rounded object-cover" />
                  <button
                    onClick={() => removeAttachment(a.id)}
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <button
        onClick={() => deleteNode(id)}
        className="w-full rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
      >
        {isMemo ? "메모 삭제" : "노드 삭제"}
      </button>
    </div>
  );
}
