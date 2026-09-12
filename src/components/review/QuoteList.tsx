import { useRef, useState } from "react";
import { fileToCompressedDataUrl } from "../../lib/compressImage";
import type { Quote, QuoteColor } from "../../types";
import PhotoLightbox from "../common/PhotoLightbox";

interface QuoteListProps {
  quotes: Quote[];
  onChange: (quotes: Quote[]) => void;
}

const COLOR_STYLES: Record<QuoteColor, { bar: string; bg: string; label: string }> = {
  yellow: { bar: "bg-yellow-300", bg: "bg-yellow-50", label: "기억할 것" },
  blue: { bar: "bg-sky-400", bg: "bg-sky-50", label: "의문" },
  pink: { bar: "bg-pink-400", bg: "bg-pink-50", label: "좋아하는 문장" },
  green: { bar: "bg-emerald-400", bg: "bg-emerald-50", label: "동의" },
  cream: { bar: "bg-stone-300", bg: "bg-stone-50", label: "일반" },
};

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
  return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function QuoteList({ quotes, onChange }: QuoteListProps) {
  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  const [color, setColor] = useState<QuoteColor>("yellow");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
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
      setPhotoUrl(await fileToCompressedDataUrl(file));
    } catch {
      alert("이미지를 불러오지 못했어요.");
    } finally {
      setUploading(false);
    }
  }

  function add() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const quote: Quote = {
      id: crypto.randomUUID(),
      bookId: "",
      text: trimmed,
      page: page.trim() || undefined,
      color,
      photoUrl,
      createdAt: new Date().toISOString(),
    };
    onChange([quote, ...quotes]);
    setText("");
    setPage("");
    setPhotoUrl(undefined);
  }

  function remove(id: string) {
    if (!confirm("이 구절을 삭제할까요?")) return;
    onChange(quotes.filter((q) => q.id !== id));
  }

  function setQuoteColor(id: string, next: QuoteColor) {
    onChange(quotes.map((q) => (q.id === id ? { ...q, color: next } : q)));
  }

  return (
    <div>
      <h3 className="font-serif text-sm font-semibold text-stone-700">구절·하이라이트</h3>

      <div className="mt-2 rounded-lg border border-stone-200 bg-white/70 p-3 shadow-sm">
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
                className={`h-5 w-5 rounded-full ${COLOR_STYLES[c].bar} ${color === c ? "ring-2 ring-stone-500 ring-offset-1" : "border border-stone-300"}`}
                title={COLOR_STYLES[c].label}
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
            placeholder="페이지/진행률"
            className="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1 text-xs"
          />
          {photoUrl && (
            <>
              <img
                src={photoUrl}
                alt=""
                className="h-10 w-10 cursor-zoom-in rounded object-cover"
                onClick={() => setLightbox(photoUrl)}
              />
              <button onClick={() => setPhotoUrl(undefined)} className="text-xs text-red-500">
                제거
              </button>
            </>
          )}
          {uploading && <span className="text-xs text-stone-500">이미지 처리 중…</span>}
          <button
            onClick={add}
            disabled={!text.trim()}
            className="bg-ink rounded-sm px-3 py-1 text-xs text-white shadow disabled:opacity-40"
          >
            추가
          </button>
        </div>
      </div>

      {quotes.length === 0 ? (
        <p className="pt-3 text-center text-xs italic text-stone-400">
          저장한 구절이 없어요. 위에서 첫 문장을 담아보세요.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {quotes.map((q) => {
            const style = COLOR_STYLES[q.color] ?? COLOR_STYLES.cream;
            return (
              <li
                key={q.id}
                className={`relative flex gap-2 rounded-md border-l-4 ${style.bar} ${style.bg} p-3 shadow-sm`}
              >
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
                    {q.text}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-stone-500">
                    {q.page && <span className="rounded bg-white/60 px-1.5 py-0.5">📖 {q.page}</span>}
                    <span>{formatDate(q.createdAt)}</span>
                    <span>· {style.label}</span>
                  </div>
                </div>
                {q.photoUrl && (
                  <img
                    src={q.photoUrl}
                    alt="구절 사진"
                    className="h-16 w-16 flex-shrink-0 cursor-zoom-in rounded object-cover"
                    onClick={() => setLightbox(q.photoUrl!)}
                  />
                )}
                <div className="flex flex-col items-end gap-1">
                  <select
                    value={q.color}
                    onChange={(e) => setQuoteColor(q.id, e.target.value as QuoteColor)}
                    className="rounded border border-stone-200 bg-white/60 px-1 py-0.5 text-[10px]"
                  >
                    {(Object.keys(COLOR_STYLES) as QuoteColor[]).map((c) => (
                      <option key={c} value={c}>
                        {COLOR_STYLES[c].label}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => remove(q.id)} className="text-[10px] text-red-400">
                    삭제
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {lightbox && <PhotoLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
