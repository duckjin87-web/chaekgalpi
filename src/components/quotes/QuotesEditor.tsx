import { useRef, useState } from "react";
import { useLibraryStore } from "../../store/useLibraryStore";
import type { QuoteColor } from "../../types";
import { fileToCompressedDataUrl } from "../../lib/compressImage";

interface QuotesEditorProps {
  bookId: string;
}

const COLOR_STYLES: Record<QuoteColor, { bar: string; bg: string; label: string }> = {
  yellow: { bar: "bg-yellow-300", bg: "bg-yellow-50", label: "기억할 것" },
  blue: { bar: "bg-sky-400", bg: "bg-sky-50", label: "의문" },
  pink: { bar: "bg-pink-400", bg: "bg-pink-50", label: "좋아하는 문장" },
  green: { bar: "bg-emerald-400", bg: "bg-emerald-50", label: "동의" },
  cream: { bar: "bg-stone-300", bg: "bg-stone-50", label: "일반" },
};

/** 붙여넣은 텍스트에서 페이지·진행률 자동 추출 */
function extractPage(text: string): string | undefined {
  const patterns: RegExp[] = [
    /(\d{1,3}%\s*\(\s*\d+\s*p\s*\))/i,
    /\bp\.?\s*(\d{1,4})\b/i,
    /(\d{1,4})\s*(?:쪽|페이지|p)\b/i,
    /(\d{1,3})%/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[0].replace(/\s+/g, " ").trim();
  }
  return undefined;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd} ${hh}:${mi}`;
}

export default function QuotesEditor({ bookId }: QuotesEditorProps) {
  const quotes = useLibraryStore((s) => s.getQuotes(bookId));
  const addQuote = useLibraryStore((s) => s.addQuote);
  const updateQuote = useLibraryStore((s) => s.updateQuote);
  const removeQuote = useLibraryStore((s) => s.removeQuote);

  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  const [color, setColor] = useState<QuoteColor>("yellow");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePaste() {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip) return;
      setText((prev) => (prev ? `${prev}\n${clip}` : clip));
      const p = extractPage(clip);
      if (p && !page) setPage(p);
    } catch {
      alert("클립보드 접근이 거부됐어요. 직접 붙여넣기(Ctrl+V)로 넣어주세요.");
    }
  }

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await fileToCompressedDataUrl(file);
      setPhotoUrl(url);
    } catch {
      alert("이미지를 불러오지 못했어요.");
    } finally {
      setUploading(false);
    }
  }

  function handleAdd() {
    const trimmed = text.trim();
    if (!trimmed) return;
    addQuote(bookId, { text: trimmed, page: page.trim() || undefined, color, photoUrl });
    setText("");
    setPage("");
    setPhotoUrl(undefined);
  }

  return (
    <div className="space-y-4">
      {/* 입력 카드 */}
      <div className="rounded-lg border border-stone-200 bg-white/70 p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            onClick={handlePaste}
            className="bg-ink rounded-sm px-2.5 py-1 text-xs tracking-wide text-white shadow"
          >
            📋 붙여넣기
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-sm border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-700"
          >
            📷 사진 첨부
          </button>
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
          <div className="ml-auto flex items-center gap-1">
            {(Object.keys(COLOR_STYLES) as QuoteColor[]).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full border ${COLOR_STYLES[c].bar} ${color === c ? "ring-2 ring-offset-1 ring-stone-500" : "border-stone-300"}`}
                title={COLOR_STYLES[c].label}
                aria-label={COLOR_STYLES[c].label}
              />
            ))}
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="전자책에서 복사한 문장을 붙여넣거나 직접 적어보세요."
          className="w-full rounded border border-stone-300 p-2 text-sm leading-relaxed"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={page}
            onChange={(e) => setPage(e.target.value)}
            placeholder="페이지/진행률 (예: 94% (530p) 또는 p.325)"
            className="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1 text-xs"
          />
          {photoUrl && (
            <div className="flex items-center gap-1">
              <img src={photoUrl} alt="첨부 사진" className="h-10 w-10 rounded object-cover" />
              <button
                onClick={() => setPhotoUrl(undefined)}
                className="text-xs text-red-500 hover:underline"
              >
                제거
              </button>
            </div>
          )}
          {uploading && <span className="text-xs text-stone-500">이미지 처리 중…</span>}
          <button
            onClick={handleAdd}
            disabled={!text.trim()}
            className="bg-ink rounded-sm px-3 py-1 text-xs tracking-wide text-white shadow disabled:opacity-40"
          >
            추가
          </button>
        </div>
      </div>

      {/* 카드 리스트 (첨부한 e-book 앱 스타일) */}
      {quotes.length === 0 ? (
        <p className="pt-4 text-center text-xs italic text-stone-400">
          저장한 구절이 없어요. 위에서 첫 문장을 담아보세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {quotes.map((q) => {
            const style = COLOR_STYLES[q.color];
            return (
              <li
                key={q.id}
                className={`relative flex gap-2 rounded-md border-l-4 ${style.bar} ${style.bg} p-3 shadow-sm`}
              >
                <div className="flex-1 min-w-0">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
                    {q.text}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-stone-500">
                    {q.page && (
                      <span className="rounded bg-white/60 px-1.5 py-0.5">📖 {q.page}</span>
                    )}
                    <span>{formatDate(q.createdAt)}</span>
                    <span className="ml-1">· {style.label}</span>
                  </div>
                </div>
                {q.photoUrl && (
                  <img
                    src={q.photoUrl}
                    alt="구절 사진"
                    className="h-16 w-16 flex-shrink-0 rounded object-cover"
                    onClick={() => window.open(q.photoUrl, "_blank")}
                  />
                )}
                <div className="flex flex-col items-end gap-1">
                  <select
                    value={q.color}
                    onChange={(e) => updateQuote(q.id, { color: e.target.value as QuoteColor })}
                    className="rounded border border-stone-200 bg-white/60 px-1 py-0.5 text-[10px]"
                    title="색상 변경"
                  >
                    {(Object.keys(COLOR_STYLES) as QuoteColor[]).map((c) => (
                      <option key={c} value={c}>
                        {COLOR_STYLES[c].label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (confirm("이 구절을 삭제할까요?")) removeQuote(q.id);
                    }}
                    className="text-[10px] text-red-400 hover:underline"
                  >
                    삭제
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
