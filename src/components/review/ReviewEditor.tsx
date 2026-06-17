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
  const [showPreview, setShowPreview] = useState(false);

  const content = review?.content ?? "";
  const rating = review?.rating ?? 0;
  const quotes = review?.quotes ?? [];

  return (
    <div className="space-y-4">
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
