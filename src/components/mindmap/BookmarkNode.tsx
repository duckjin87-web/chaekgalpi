import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { MindMapNodeData } from "../../types";
import { nodeLevelStyle } from "../../theme";

type BookmarkFlowNode = Node<MindMapNodeData, "bookmark">;

const handleClass =
  "!h-4 !w-4 !border-2 !border-white !bg-emerald-700 !shadow hover:!bg-emerald-500";

export default function BookmarkNode({ data, selected }: NodeProps<BookmarkFlowNode>) {
  const level = data.level ?? "medium";
  const style = nodeLevelStyle[level];

  return (
    <div
      className={`rounded-md border-2 text-white shadow-md ${
        selected ? "border-stone-800" : "border-transparent"
      }`}
      style={{
        backgroundColor: data.color,
        minWidth: style.minWidth,
        maxWidth: 260,
        padding: style.padding,
      }}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <p
        className="break-words leading-snug"
        style={{ fontSize: style.fontSize, fontWeight: style.fontWeight }}
      >
        {data.text}
      </p>
      {(data.memo || data.attachments.length > 0) && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-white/80">
          {data.memo && <span>📝</span>}
          {data.attachments.length > 0 && <span>🖼 {data.attachments.length}</span>}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}
