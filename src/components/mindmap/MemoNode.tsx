import { useEffect, useRef, useState } from "react";
import { Handle, Position, NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import type { MindMapNodeData } from "../../types";
import { useLibraryStore } from "../../store/useLibraryStore";
import { useMindMapActions } from "./MindMapContext";
import { fileToCompressedDataUrl } from "../../lib/compressImage";

type MemoFlowNode = Node<MindMapNodeData, "memo">;

const handleClass =
  "!h-4 !w-4 !border-2 !border-white !bg-amber-600 !shadow hover:!bg-amber-400";

export default function MemoNode({ id, data, selected }: NodeProps<MemoFlowNode>) {
  const fontSize = data.fontSize ?? 14;
  const opacity = data.opacity ?? 1;
  const { updateNodeData, addChild } = useMindMapActions();
  const palette = useLibraryStore((s) => s.memoPalette);
  const reshufflePalette = useLibraryStore((s) => s.reshuffleMemoPalette);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.text);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const pressTimer = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    try {
      const url = await fileToCompressedDataUrl(file);
      updateNodeData(id, { photoUrl: url });
    } catch {
      alert("이미지를 불러오지 못했어요.");
    }
  }

  useEffect(() => {
    if (editing) {
      setDraft(data.text);
      textRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // 새로 만든 메모는 바로 편집 상태로 시작
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

      {selected && (
        <div
          className="nodrag nopan nowheel absolute left-1/2 top-full z-20 mt-3 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/40 bg-white/85 px-2 py-1 shadow-xl backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {palette.map((color) => (
            <button
              key={color}
              onClick={() => updateNodeData(id, { color })}
              className={`h-4 w-4 rounded-full ring-2 transition-transform hover:scale-110 ${
                data.color === color ? "ring-stone-700" : "ring-transparent"
              }`}
              style={{ backgroundColor: color }}
              aria-label={color}
            />
          ))}
          <button
            onClick={reshufflePalette}
            className="flex h-4 w-4 items-center justify-center rounded-full bg-white/70 text-[10px] text-stone-600 transition-transform hover:rotate-180"
            title="기본 색상 5가지 랜덤 재배치"
          >
            ↻
          </button>
          <div className="h-4 w-px bg-stone-300/60" />
          <input
            type="range"
            min={10}
            max={32}
            value={fontSize}
            onChange={(e) => updateNodeData(id, { fontSize: Number(e.target.value) })}
            className="h-3 w-14"
            title="글자 크기"
          />
          <input
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => updateNodeData(id, { opacity: Number(e.target.value) })}
            className="h-3 w-14"
            title="투명도"
          />
          <div className="h-4 w-px bg-stone-300/60" />
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] text-stone-600 hover:bg-white"
            title="사진 첨부"
          >
            📷
          </button>
          {data.photoUrl && (
            <button
              onClick={() => updateNodeData(id, { photoUrl: undefined })}
              className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-white"
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
        </div>
      )}

      <div
        className="h-full w-full overflow-hidden rounded-sm p-3 text-stone-800"
        style={{
          backgroundColor: data.color,
          opacity,
          boxShadow: "2px 3px 6px rgba(0,0,0,0.18)",
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
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            placeholder="메모를 입력하세요"
          />
        ) : (
          <div className="flex h-full w-full flex-col gap-1">
            {data.photoUrl && (
              <img
                src={data.photoUrl}
                alt="첨부 사진"
                className="max-h-[60%] w-full rounded-sm object-cover"
              />
            )}
            <p className="whitespace-pre-wrap break-words leading-snug" style={{ fontSize }}>
              {data.text || "메모를 입력하세요"}
            </p>
          </div>
        )}
      </div>

      {/* + 버튼으로 연결된 노드 생성 */}
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
    </div>
  );
}
