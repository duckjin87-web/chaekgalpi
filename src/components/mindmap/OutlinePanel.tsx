export interface OutlineRow {
  id: string;
  depth: number;
  text: string;
  marker?: string;
  memo: boolean;
  children: number;
}

interface OutlinePanelProps {
  rows: OutlineRow[];
  onPick: (id: string) => void;
  onClose: () => void;
}

/** 목차(아웃라인) 보기 — 마인드맵을 들여쓴 목록으로 보여주고, 누르면 그 노드로 이동 */
export default function OutlinePanel({ rows, onPick, onClose }: OutlinePanelProps) {
  return (
    <div className="nodrag nopan nowheel absolute inset-0 z-30 flex justify-end bg-black/20" onClick={onClose}>
      <div
        className="flex h-full w-[min(20rem,85%)] flex-col border-l border-stone-300 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h3 className="font-serif text-base font-bold text-stone-800">목차</h3>
          <button onClick={onClose} className="px-1 text-xl leading-none text-stone-400" aria-label="닫기">
            ×
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto py-2">
          {rows.length === 0 && <li className="px-4 py-2 text-sm text-stone-400">노드가 없어요.</li>}
          {rows.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => onPick(r.id)}
                className="flex w-full items-start gap-1.5 py-1.5 pr-3 text-left hover:bg-stone-100 active:bg-stone-100"
                style={{ paddingLeft: 16 + r.depth * 16 }}
              >
                <span className="mt-[3px] shrink-0 text-[10px] text-stone-400">
                  {r.memo ? "📝" : r.children > 0 ? "▸" : "•"}
                </span>
                <span
                  className={`min-w-0 flex-1 whitespace-pre-wrap break-words leading-snug ${
                    r.depth === 0 ? "text-sm font-bold text-stone-800" : "text-[13px] text-stone-700"
                  } ${r.text ? "" : "opacity-40"}`}
                >
                  {r.marker && <span className="mr-1">{r.marker}</span>}
                  {r.text || (r.memo ? "빈 메모" : "새 노드")}
                </span>
                {r.children > 0 && (
                  <span className="shrink-0 rounded-full bg-stone-100 px-1.5 text-[10px] text-stone-500">
                    {r.children}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
