import { useEffect, useRef, useState } from "react";
import { Handle, NodeResizer, Position, type Node, type NodeProps } from "@xyflow/react";
import type { MindMapNodeData } from "../../types";
import { nodeLevelStyle } from "../../theme";
import { useMindMapActions } from "./MindMapContext";
import InlineNodeEditor from "./InlineNodeEditor";
import { fileToCompressedDataUrl } from "../../lib/compressImage";

type BookmarkFlowNode = Node<MindMapNodeData, "bookmark">;

const handleClass =
  "!h-4 !w-4 !border-2 !border-white !bg-emerald-700 !shadow hover:!bg-emerald-500";

export default function BookmarkNode({ id, data, selected }: NodeProps<BookmarkFlowNode>) {
  const level = data.level ?? "medium";
  const style = nodeLevelStyle[level];
  const { updateNodeData, addChild, nodeShapeClass } = useMindMapActions();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.text);
  const pressTimer = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(data.text);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const didAutoEdit = useRef(false);
  useEffect(() => {
    if (data.autoEdit && !didAutoEdit.current) {
      didAutoEdit.current = true;
      setEditing(true);
      updateNodeData(id, { autoEdit: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.autoEdit]);

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
  async function handleFile(file: File) {
    try {
      const url = await fileToCompressedDataUrl(file);
      updateNodeData(id, { photoUrl: url });
    } catch {
      alert("이미지를 불러오지 못했어요.");
    }
  }

  return (
    <div
      className={`relative h-full w-full text-stone-800 shadow-md transition-shadow ${nodeShapeClass} ${
        selected ? "shadow-lg" : ""
      }`}
      style={{
        backgroundColor: data.color,
        minWidth: style.minWidth,
        padding: style.padding,
        borderWidth: style.borderWidth,
        borderStyle: "solid",
        borderColor: selected ? "#292524" : "transparent",
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
      <NodeResizer
        isVisible={selected}
        minWidth={style.minWidth}
        minHeight={40}
        lineClassName="!border-emerald-500"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-white !bg-emerald-600"
      />
      <Handle type="target" position={Position.Left} className={handleClass} />

      {data.photoUrl && (
        <img
          src={data.photoUrl}
          alt="첨부 사진"
          className="mb-1 block max-h-40 w-full rounded-sm object-contain"
        />
      )}

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

      {/* 사진 첨부 버튼 (선택 시) */}
      {selected && (
        <>
          <button
            className="nodrag absolute -top-2.5 -right-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-white/95 text-xs shadow"
            onClick={(e) => {
              e.stopPropagation();
              fileRef.current?.click();
            }}
            title="사진 첨부"
          >
            📷
          </button>
          {data.photoUrl && (
            <button
              className="nodrag absolute -top-2.5 right-4 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-white/95 text-xs text-red-500 shadow"
              onClick={(e) => {
                e.stopPropagation();
                updateNodeData(id, { photoUrl: undefined });
              }}
              title="사진 제거"
            >
              ×
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </>
      )}

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

      {selected && <InlineNodeEditor id={id} data={data} />}
    </div>
  );
}
