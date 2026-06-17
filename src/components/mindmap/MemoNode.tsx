import { Handle, Position, NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import type { MindMapNodeData } from "../../types";

type MemoFlowNode = Node<MindMapNodeData, "memo">;

const handleClass =
  "!h-4 !w-4 !border-2 !border-white !bg-amber-600 !shadow hover:!bg-amber-400";

export default function MemoNode({ data, selected }: NodeProps<MemoFlowNode>) {
  const fontSize = data.fontSize ?? 14;

  return (
    <div
      className="h-full w-full overflow-hidden rounded-sm p-3 text-stone-800 shadow-md"
      style={{
        backgroundColor: data.color,
        // 포스트잇 느낌의 살짝 접힌 모서리
        boxShadow: "2px 3px 6px rgba(0,0,0,0.2)",
        outline: selected ? "2px solid #57534e" : "none",
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={80}
        lineClassName="!border-amber-500"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-white !bg-amber-500"
      />
      <Handle type="target" position={Position.Top} className={handleClass} />
      <p className="whitespace-pre-wrap break-words leading-snug" style={{ fontSize }}>
        {data.text || "메모를 입력하세요"}
      </p>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}
