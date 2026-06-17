import type { ChangeEvent } from "react";
import type { MindMapNodeData, NodeAttachment } from "../../types";
import { bookmarkColors } from "../../theme";

interface NodeSidePanelProps {
  node: { id: string; data: MindMapNodeData } | null;
  onUpdate: (id: string, patch: Partial<MindMapNodeData>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function NodeSidePanel({ node, onUpdate, onDelete, onClose }: NodeSidePanelProps) {
  if (!node) return null;

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
        <h3 className="font-serif text-sm font-semibold text-stone-800">노드 편집</h3>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
          ✕
        </button>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600">텍스트</label>
        <input
          className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
          value={node.data.text}
          onChange={(e) => onUpdate(node.id, { text: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600">색상</label>
        <div className="mt-1 flex gap-1">
          {bookmarkColors.map((color) => (
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
      <button
        onClick={() => onDelete(node.id)}
        className="w-full rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
      >
        노드 삭제
      </button>
    </div>
  );
}
