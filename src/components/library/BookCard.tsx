import { Link } from "react-router-dom";
import type { Book } from "../../types";

interface BookCardProps {
  book: Book;
}

const statusLabel: Record<Book["status"], string> = {
  읽고싶음: "읽고 싶음",
  읽는중: "읽는 중",
  완독: "완독",
};

/** YES24 배지 톤: 진행중=블루, 위시=회색, 완독=레드 */
const statusBadge: Record<Book["status"], string> = {
  읽고싶음: "text-stone-500",
  읽는중: "text-ink",
  완독: "text-y24red",
};

/** YES24 상품 리스트 행 — 썸네일 좌측, 정보 우측 */
export default function BookCard({ book }: BookCardProps) {
  const isEbook = book.bookType === "전자책";
  const total = isEbook ? 100 : book.pageCount ?? 0;
  const current = book.currentPage ?? 0;
  const progress = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const showProgress = book.status === "읽는중" && total > 0;

  return (
    <Link to={`/book/${book.id}`} className="flex gap-3 bg-white px-3 py-3 active:bg-stone-50">
      {/* 표지 */}
      <div className="w-[62px] flex-shrink-0">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="block w-full rounded-sm border border-stone-200 object-contain shadow-sm"
          />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center rounded-sm border border-stone-200 bg-stone-100 text-[10px] text-stone-400">
            표지 없음
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <p className="min-w-0 flex-1 text-[14px] font-bold leading-snug text-stone-800">
            {book.title}
          </p>
        </div>

        <p className="y24-meta mt-1 truncate">
          {book.author}
          {book.publisher && (
            <>
              <span className="sep">|</span>
              {book.publisher}
            </>
          )}
          {book.publishedDate && (
            <>
              <span className="sep">|</span>
              {book.publishedDate.slice(0, 10)}
            </>
          )}
        </p>

        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={`y24-badge ${statusBadge[book.status]}`}>
            {statusLabel[book.status]}
          </span>
          {isEbook && <span className="y24-badge text-stone-400">eBook</span>}
        </div>

        {/* 진행률 — YES24식 얇은 바 */}
        {showProgress && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-[#1a54a6]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-ink">{progress}%</span>
          </div>
        )}
      </div>
    </Link>
  );
}
