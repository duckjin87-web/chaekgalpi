import { useEffect, useRef, useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { MindMapNodeData } from "../../types";
import { nodeLevelStyle } from "../../theme";
import { useMindMapActions } from "./MindMapContext";
import InlineNodeEditor from "./InlineNodeEditor";

type BookmarkFlowNode = Node<MindMapNodeData, "bookmark">;

const handleClass =
  "!h-4 !w-4 !border-2 !border-white !bg-emerald-700 !shadow hover:!bg-emerald-500";

export default function BookmarkNode({ id, data, selected }: NodeProps<BookmarkFlowNode>) {
  const level = data.level ?? "medium";
  const style = nodeLevelStyle[level];
  const { updateNodeData, addChild, deleteNode, nodeShapeClass } = useMindMapActions();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.text);
  const pressTimer = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(data.text);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function commitDraft() {
    setEditing(false);
    if (draft !== data.text) updateNodeData(id, { text: draft });
  }

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
    <div
      className={`relative border-2 text-stone-800 shadow-md transition-shadow ${nodeShapeClass} ${
        selected ? "border-stone-800 shadow-lg" : "border-transparent"
      }`}
      style={{
        backgroundColor: data.color,
        minWidth: style.minWidth,
        maxWidth: 260,
        padding: style.padding,
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
      <Handle type="target" position={Position.Left} className={handleClass} />
      {editing ? (
        <input
          ref={inputRef}
          className="nodrag w-full rounded bg-white/95 px-1 text-stone-900 outline-none"
          style={{ fontSize: style.fontSize, fontWeight: style.fontWeight }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
        />
      ) : (
        <p
          className="break-words leading-snug"
          style={{ fontSize: style.fontSize, fontWeight: style.fontWeight }}
        >
          {data.text}
        </p>
      )}
      <Handle type="source" position={Position.Right} className={handleClass} />

      {/* + 버튼 → 연결된 자식 노드 생성 */}
      <button
        className="nodrag absolute -bottom-2.5 -right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-emerald-700 text-base leading-none text-white shadow hover:bg-emerald-500"
        onClick={(e) => {
          e.stopPropagation();
          addChild(id);
        }}
        title="연결된 노드 추가"
      >
        +
      </button>

      {/* 선택 시 휴지통 버튼으로 노드 삭제 */}
      {selected && (
        <button
          className="nodrag absolute -top-2.5 -right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-red-600 text-xs leading-none text-white shadow hover:bg-red-500"
          onClick={(e) => {
            e.stopPropagation();
            deleteNode(id);
          }}
          title="노드 삭제"
        >
          🗑
        </button>
      )}

      {selected && <InlineNodeEditor id={id} data={data} />}
    </div>
  );
}
