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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    setDraft(data.text);
    // 다음 프레임에 실제 내용이 들어간 뒤 높이를 맞춘다.
    // (이걸 안 하면 rows=1 높이 그대로라 커서가 있는 마지막 줄만 보인다)
    requestAnimationFrame(() => {
      const ta = inputRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
      ta.focus();
      // 모바일에서 전체 선택은 실수로 지우기 쉬워 커서만 끝으로 보낸다
      const end = ta.value.length;
      ta.setSelectionRange(end, end);
      ta.scrollTop = 0;
    });
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

  /** 커서 위치에 줄바꿈 삽입 (모바일 키보드에 줄바꿈 키가 없을 때용) */
  function insertNewline() {
    const ta = inputRef.current;
    if (!ta) {
      setDraft((d) => d + "\n");
      return;
    }
    const start = ta.selectionStart ?? draft.length;
    const end = ta.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + "\n" + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + 1;
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    });
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
        // 편집 중에는 크기를 조절해 둔 노드라도 내용만큼 늘어나게 한다
        ...(editing ? { height: "auto", minHeight: "100%" } : null),
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
        <div className="nodrag">
          <textarea
            ref={inputRef}
            rows={1}
            className="nodrag w-full resize-none rounded bg-white/95 px-1 leading-snug text-stone-900 outline-none"
            style={{
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              maxHeight: "45vh",
              overflowY: "auto",
            }}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              // 내용에 맞춰 높이 자동 조절
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onBlur={(e) => {
              // 줄바꿈/완료 버튼으로 포커스가 옮겨간 경우는 커밋하지 않는다
              const next = e.relatedTarget as HTMLElement | null;
              if (next && e.currentTarget.parentElement?.contains(next)) return;
              commitDraft();
            }}
            placeholder="새 노드"
            onKeyDown={(e) => {
              // Enter = 줄바꿈, Ctrl/⌘+Enter = 완료
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commitDraft();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              }
            }}
          />
          {/* 줄바꿈 / 완료 */}
          <div className="mt-1 flex items-center justify-end gap-1">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={insertNewline}
              className="rounded border border-stone-300 bg-white/95 px-1.5 py-0.5 text-[11px] leading-none text-stone-600 shadow-sm"
              title="줄바꿈"
            >
              ↵ 줄바꿈
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={commitDraft}
              className="rounded bg-emerald-700 px-1.5 py-0.5 text-[11px] leading-none text-white shadow-sm"
              title="입력 완료"
            >
              완료
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`whitespace-pre-wrap break-words leading-snug ${
            data.text ? "" : "opacity-40"
          }`}
          style={{ fontSize: style.fontSize, fontWeight: style.fontWeight }}
        >
          {data.text || "새 노드"}
        </p>
      )}

      <Handle type="source" position={Position.Right} className={handleClass} />

      {/* 상단 중앙 버튼 바: 📷(선택시)  ×(사진 제거·있을때)  +(항상) */}
      <div className="nodrag absolute -top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
        {selected && (
          <button
            className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-white/95 text-xs shadow"
            onClick={(e) => {
              e.stopPropagation();
              fileRef.current?.click();
            }}
            title="사진 첨부"
          >
            📷
          </button>
        )}
        {selected && data.photoUrl && (
          <button
            className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-white/95 text-xs text-red-500 shadow"
            onClick={(e) => {
              e.stopPropagation();
              updateNodeData(id, { photoUrl: undefined });
            }}
            title="사진 제거"
          >
            ×
          </button>
        )}
        <button
          className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-emerald-700 text-base leading-none text-white shadow hover:bg-emerald-500"
          onClick={(e) => {
            e.stopPropagation();
            addChild(id);
          }}
          title="연결된 노드 추가"
        >
          +
        </button>
      </div>
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

      {selected && <InlineNodeEditor id={id} data={data} />}
    </div>
  );
}
