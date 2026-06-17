import type { ChangeEvent } from "react";
import type { MindMapNodeData, MindNodeKind, NodeAttachment, NodeLevel } from "../../types";
import { bookmarkColors, memoColors, nodeLevelOrder, nodeLevelStyle } from "../../theme";

interface NodeSidePanelProps {
  node: { id: string; type?: MindNodeKind; data: MindMapNodeData } | null;
  onUpdate: (id: string, patch: Partial<MindMapNodeData>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function NodeSidePanel({ node, onUpdate, onDelete, onClose }: NodeSidePanelProps) {
  if (!node) return null;
  const isMemo = node.type === "memo";

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !node) return;
    const reader = new FileReader();
    reader.onload = () => {
      const attachment: NodeAttachment = {
        id: crypto.randomUUID(),
        url: String(reader.result),
        name: file.name,
      };
      onUpdate(node.id, { attachments: [...node.data.attachments, attachment] });
    };
    reader.readAsDataURL(file);
  }

  function removeAttachment(attachmentId: string) {
    if (!node) return;
    onUpdate(node.id, {
      attachments: node.data.attachments.filter((a) => a.id !== attachmentId),
    });
  }

  return (
    <div className="absolute right-4 top-4 z-10 w-72 space-y-3 rounded-md border border-stone-300 bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-sm font-semibold text-stone-800">
          {isMemo ? "메모 편집" : "노드 편집"}
        </h3>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
          ✕
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-600">
          {isMemo ? "메모 내용" : "텍스트"}
        </label>
        {isMemo ? (
          <textarea
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            rows={4}
            value={node.data.text}
            onChange={(e) => onUpdate(node.id, { text: e.target.value })}
            placeholder="이 노드에 대한 생각을 적어보세요."
          />
        ) : (
          <input
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
            value={node.data.text}
            onChange={(e) => onUpdate(node.id, { text: e.target.value })}
          />
        )}
      </div>

      {/* 기능 3: 대/중/소 주제 구분 (bookmark 전용) */}
      {!isMemo && (
        <div>
          <label className="block text-xs font-medium text-stone-600">주제 단계</label>
          <div className="mt-1 grid grid-cols-4 gap-1">
            {nodeLevelOrder.map((level: NodeLevel) => (
              <button
                key={level}
                onClick={() => onUpdate(node.id, { level })}
                className={`rounded border px-1 py-1 text-xs ${
                  (node.data.level ?? "medium") === level
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

      {/* 기능 4: 메모 폰트 크기 조정 */}
      {isMemo && (
        <div>
          <label className="block text-xs font-medium text-stone-600">
            글자 크기 ({node.data.fontSize ?? 14}px)
          </label>
          <input
            type="range"
            min={10}
            max={32}
            value={node.data.fontSize ?? 14}
            onChange={(e) => onUpdate(node.id, { fontSize: Number(e.target.value) })}
            className="mt-1 w-full"
          />
          <p className="text-[11px] text-stone-400">크기 조절은 메모 모서리를 드래그하세요.</p>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-stone-600">색상</label>
        <div className="mt-1 flex gap-1">
          {(isMemo ? memoColors : bookmarkColors).map((color) => (
            <button
              key={color}
              onClick={() => onUpdate(node.id, { color })}
              className={`h-6 w-6 rounded-full border-2 ${
                node.data.color === color ? "border-stone-800" : "border-transparent"
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
            <label className="block text-xs font-medium text-stone-600">메모</label>
            <textarea
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
              rows={4}
              value={node.data.memo}
              onChange={(e) => onUpdate(node.id, { memo: e.target.value })}
              placeholder="이 노드에 대한 생각을 자유롭게 적어보세요."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600">이미지/인용 첨부</label>
            <input type="file" accept="image/*" onChange={handleFile} className="mt-1 text-xs" />
            <div className="mt-2 flex flex-wrap gap-2">
              {node.data.attachments.map((a) => (
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
        onClick={() => onDelete(node.id)}
        className="w-full rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
      >
        {isMemo ? "메모 삭제" : "노드 삭제"}
      </button>
    </div>
  );
}
