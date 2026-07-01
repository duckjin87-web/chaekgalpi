import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useLibraryStore } from "../../store/useLibraryStore";
import RatingStars from "./RatingStars";
import QuoteList from "./QuoteList";

interface ReviewEditorProps {
  bookId: string;
}

export default function ReviewEditor({ bookId }: ReviewEditorProps) {
  const review = useLibraryStore((s) => s.getReview(bookId));
  const upsertReview = useLibraryStore((s) => s.upsertReview);
  const book = useLibraryStore((s) => s.books.find((b) => b.id === bookId));
  const updateBook = useLibraryStore((s) => s.updateBook);
  const [showPreview, setShowPreview] = useState(false);

  const content = review?.content ?? "";
  const rating = review?.rating ?? 0;
  const quotes = review?.quotes ?? [];

  const prompts = book?.readingPrompts?.questions ?? [];
  const answers = book?.promptAnswers ?? [];

  function setAnswer(index: number, value: string) {
    const next = [...answers];
    while (next.length < prompts.length) next.push("");
    next[index] = value;
    updateBook(bookId, { promptAnswers: next });
  }

  return (
    <div className="space-y-4">
      {prompts.length > 0 && (
        <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="text-xs font-medium text-emerald-800">📖 서평으로 보는 생각거리</p>
          {prompts.map((q, i) => (
            <div key={i} className="space-y-1">
              <p className="text-sm text-stone-700">
                <span className="mr-1 font-medium text-emerald-800">Q{i + 1}.</span>
                {q}
              </p>
              <textarea
                className="w-full rounded border border-stone-200 bg-white p-2 text-sm leading-relaxed"
                rows={2}
                value={answers[i] ?? ""}
                onChange={(e) => setAnswer(i, e.target.value)}
                placeholder="생각을 간략히 적어보세요…"
              />
            </div>
          ))}
          {book?.readingPrompts?.coreTheme && (
            <p className="border-t border-emerald-100 pt-2 text-sm text-stone-600">
              <span className="mr-1 font-medium text-amber-700">핵심 주제.</span>
              {book.readingPrompts.coreTheme}
            </p>
          )}
        </div>
      )}

      <div>
        <h3 className="font-serif text-sm font-semibold text-stone-700">별점</h3>
        <RatingStars value={rating} onChange={(value) => upsertReview(bookId, { rating: value })} />
      </div>

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
          <div className="prose prose-sm mt-2 min-h-[160px] rounded border border-stone-200 bg-white p-3">
            <ReactMarkdown>{content || "*아직 작성한 내용이 없어요.*"}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            className="mt-2 w-full rounded border border-stone-300 p-3 text-sm leading-relaxed"
            rows={10}
            value={content}
            onChange={(e) => upsertReview(bookId, { content: e.target.value })}
            placeholder="마크다운으로 자유롭게 독후감을 작성해보세요."
          />
        )}
      </div>

      <QuoteList quotes={quotes} onChange={(next) => upsertReview(bookId, { quotes: next })} />
    </div>
  );
}
