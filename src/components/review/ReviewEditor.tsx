import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useLibraryStore } from "../../store/useLibraryStore";
import RatingStars from "./RatingStars";
import QuoteList from "./QuoteList";
import PhotoLightbox from "../common/PhotoLightbox";
import { fileToCompressedDataUrl } from "../../lib/compressImage";

interface ReviewEditorProps {
  bookId: string;
}

export default function ReviewEditor({ bookId }: ReviewEditorProps) {
  const review = useLibraryStore((s) => s.getReview(bookId));
  const upsertReview = useLibraryStore((s) => s.upsertReview);
  const book = useLibraryStore((s) => s.books.find((b) => b.id === bookId));
  const updateBook = useLibraryStore((s) => s.updateBook);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const content = review?.content ?? "";
  const rating = review?.rating ?? 0;
  const photoUrl = review?.photoUrl;
  const quotes = review?.quotes ?? [];

  const prompts = book?.readingPrompts?.questions ?? [];
  const answers = book?.promptAnswers ?? [];

  function setAnswer(index: number, value: string) {
    const next = [...answers];
    while (next.length < prompts.length) next.push("");
    next[index] = value;
    updateBook(bookId, { promptAnswers: next });
  }

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await fileToCompressedDataUrl(file);
      upsertReview(bookId, { photoUrl: url });
    } catch {
      alert("이미지를 불러오지 못했어요.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 서평 생각거리 — 별도 카드, 답변 칸 크게 (기존 2배 이상) */}
      {prompts.length > 0 && (
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">📖</span>
            <p className="font-serif text-sm font-bold text-emerald-900">
              서평으로 보는 생각거리
            </p>
          </div>
          <div className="space-y-4">
            {prompts.map((q, i) => (
              <div key={i} className="rounded-lg bg-white/70 p-3">
                <p className="text-sm leading-relaxed text-stone-800">
                  <span className="mr-1 font-bold text-emerald-800">Q{i + 1}.</span>
                  {q}
                </p>
                <textarea
                  className="mt-2 w-full resize-y rounded border border-stone-200 bg-white p-3 text-sm leading-relaxed"
                  rows={6}
                  value={answers[i] ?? ""}
                  onChange={(e) => setAnswer(i, e.target.value)}
                  placeholder="생각을 자유롭게 적어보세요. 오른쪽 아래 모서리로 크기 조절 가능해요."
                />
              </div>
            ))}
          </div>
          {book?.readingPrompts?.coreTheme && (
            <p className="mt-3 border-t border-emerald-200 pt-2 text-sm text-stone-600">
              <span className="mr-1 font-medium text-amber-700">핵심 주제.</span>
              {book.readingPrompts.coreTheme}
            </p>
          )}
        </div>
      )}

      {/* 별점 */}
      <div>
        <h3 className="font-serif text-sm font-semibold text-stone-700">별점</h3>
        <RatingStars value={rating} onChange={(value) => upsertReview(bookId, { rating: value })} />
      </div>

      {/* 독후감 본문 */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-sm font-semibold text-stone-700">독후감</h3>
          <button
            onClick={() => setShowPreview((p) => !p)}
            className="text-xs text-emerald-700 hover:underline"
          >
            {showPreview ? "편집하기" : "미리보기"}
          </button>
        </div>
        {showPreview ? (
          <div className="prose prose-sm mt-2 min-h-[200px] rounded border border-stone-200 bg-white p-3">
            <ReactMarkdown>{content || "*아직 작성한 내용이 없어요.*"}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            className="mt-2 w-full resize-y rounded border border-stone-300 p-3 text-sm leading-relaxed"
            rows={12}
            value={content}
            onChange={(e) => upsertReview(bookId, { content: e.target.value })}
            placeholder="마크다운으로 자유롭게 독후감을 작성해보세요."
          />
        )}
      </div>

      {/* 사진 첨부 (독후감 대표 사진) */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-sm font-semibold text-stone-700">대표 사진</h3>
          <div className="flex items-center gap-2">
            {uploading && <span className="text-xs text-stone-500">이미지 처리 중…</span>}
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-sm border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-700"
            >
              📷 {photoUrl ? "사진 교체" : "사진 추가"}
            </button>
            {photoUrl && (
              <button
                onClick={() => upsertReview(bookId, { photoUrl: undefined })}
                className="text-xs text-red-500 hover:underline"
              >
                제거
              </button>
            )}
          </div>
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
        {photoUrl && (
          <img
            src={photoUrl}
            alt="독후감 첨부 사진"
            className="mt-2 max-h-72 w-full cursor-zoom-in rounded border border-stone-200 object-contain"
            onClick={() => setLightbox(photoUrl)}
          />
        )}
      </div>

      {/* 구절·하이라이트 (독후감에 포함) */}
      <QuoteList
        quotes={quotes}
        onChange={(next) => upsertReview(bookId, { quotes: next })}
      />

      {lightbox && <PhotoLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
