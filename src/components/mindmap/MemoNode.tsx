import { useEffect, useRef, useState } from "react";
import { Handle, Position, NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import type { MindMapNodeData } from "../../types";
import { useMindMapActions } from "./MindMapContext";
import InlineNodeEditor from "./InlineNodeEditor";

type MemoFlowNode = Node<MindMapNodeData, "memo">;

const handleClass =
  "!h-4 !w-4 !border-2 !border-white !bg-amber-600 !shadow hover:!bg-amber-400";

export default function MemoNode({ id, data, selected }: NodeProps<MemoFlowNode>) {
  const fontSize = data.fontSize ?? 14;
  const { updateNodeData, addChild } = useMindMapActions();
  const [editing, setEditing] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const pressTimer = useRef<number | null>(null);

  useEffect(() => {
    if (editing) textRef.current?.focus();
  }, [editing]);

  function startPress() {
    pressTimer.current = window.setTimeout(() => setEditing(true), 500);
  }
  function cancelPress() {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  return (
    <div className="relative h-full w-full">
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={80}
        lineClassName="!border-amber-500"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-white !bg-amber-500"
      />
      <Handle type="target" position={Position.Left} className={handleClass} />
      <Handle type="source" position={Position.Right} className={handleClass} />

      <div
        className="h-full w-full overflow-hidden rounded-sm p-3 text-stone-800"
        style={{
          backgroundColor: data.color,
          boxShadow: "2px 3px 6px rgba(0,0,0,0.2)",
          outline: selected ? "2px solid #57534e" : "none",
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerMove={cancelPress}
        onPointerLeave={cancelPress}
      >
        {editing ? (
          <textarea
            ref={textRef}
            className="nodrag h-full w-full resize-none bg-transparent outline-none"
            style={{ fontSize }}
            value={data.text}
            onChange={(e) => updateNodeData(id, { text: e.target.value })}
            onBlur={() => setEditing(false)}
            placeholder="메모를 입력하세요"
          />
        ) : (
          <p className="whitespace-pre-wrap break-words leading-snug" style={{ fontSize }}>
            {data.text || "메모를 입력하세요"}
          </p>
        )}
      </div>

      {/* 기능 5: + 버튼으로 연결된 노드 생성 */}
      <button
        className="nodrag absolute -bottom-2.5 -right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-amber-600 text-base leading-none text-white shadow hover:bg-amber-400"
        onClick={(e) => {
          e.stopPropagation();
          addChild(id);
        }}
        title="연결된 노드 추가"
      >
        +
      </button>

      {selected && <InlineNodeEditor id={id} type="memo" data={data} />}
    </div>
  );
}
