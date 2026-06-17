import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { MindMapNodeData } from "../../types";

type BookmarkFlowNode = Node<MindMapNodeData, "bookmark">;

export default function BookmarkNode({ data, selected }: NodeProps<BookmarkFlowNode>) {
  return (
    <div
      className={`min-w-[120px] max-w-[220px] rounded-md border-2 px-3 py-2 text-sm text-white shadow-md ${
        selected ? "border-stone-800" : "border-transparent"
      }`}
      style={{ backgroundColor: data.color }}
    >
      <Handle type="target" position={Position.Top} />
      <p className="break-words font-medium">{data.text}</p>
      {(data.memo || data.attachments.length > 0) && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-white/80">
          {data.memo && <span>📝</span>}
          {data.attachments.length > 0 && <span>🖼 {data.attachments.length}</span>}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
