import { useState } from "react";
import type { Book, BookStatus } from "../../types";
import { normalizeSpineInput } from "../../lib/bookSpine";

interface EditBookModalProps {
  book: Book;
  onClose: () => void;
  onSave: (patch: Partial<Book>) => void;
}

export default function EditBookModal({ book, onClose, onSave }: EditBookModalProps) {
  const [author, setAuthor] = useState(book.author);
  const [bookType, setBookType] = useState<"종이책" | "전자책">(
    book.bookType === "전자책" ? "전자책" : "종이책"
  );
  const [pageCount, setPageCount] = useState(book.pageCount ? String(book.pageCount) : "");
  const [currentPage, setCurrentPage] = useState(book.currentPage ? String(book.currentPage) : "");
  const [publisher, setPublisher] = useState(book.publisher ?? "");
  const [publishedDate, setPublishedDate] = useState(book.publishedDate ?? "");
  const [status, setStatus] = useState<BookStatus>(book.status);
  const [spineInput, setSpineInput] = useState(book.spineUrl ?? "");

  const isEbook = bookType === "전자책";
  const spinePreview = normalizeSpineInput(spineInput);
  const spineInvalid = spineInput.trim().length > 0 && !spinePreview;

  function handleSubmit() {
    onSave({
      author: author.trim(),
      bookType,
      pageCount: isEbook ? undefined : pageCount ? Number(pageCount) : undefined,
      currentPage: currentPage ? Number(currentPage) : undefined,
      publisher: publisher.trim() || undefined,
      publishedDate: publishedDate.trim() || undefined,
      status,
      spineUrl: spineInput.trim() ? spinePreview : undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="y24-card max-h-[90vh] w-80 space-y-3 overflow-y-auto p-5">
        <h2 className="text-[17px] font-bold text-stone-800">책 정보 수정</h2>
        <p className="text-sm text-stone-500">{book.title}</p>
        <div>
          <label className="block text-xs font-medium text-stone-600">저자</label>
          <input
            autoFocus
            className="mt-1 w-full rounded-sm border border-[#d9e2ef] px-2 py-1 text-sm"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600">출판사</label>
          <input
            className="mt-1 w-full rounded-sm border border-[#d9e2ef] px-2 py-1 text-sm"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600">책 유형</label>
          <select
            className="mt-1 w-full rounded-sm border border-[#d9e2ef] px-2 py-1 text-sm"
            value={bookType}
            onChange={(e) => setBookType(e.target.value as "종이책" | "전자책")}
          >
            <option value="종이책">종이책</option>
            <option value="전자책">전자책</option>
          </select>
        </div>
        <div className="flex gap-2">
          {!isEbook && (
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-600">전체 페이지</label>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-sm border border-[#d9e2ef] px-2 py-1 text-sm"
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value)}
              />
            </div>
          )}
          <div className="flex-1">
            <label className="block text-xs font-medium text-stone-600">
              {isEbook ? "현재 진도 (%)" : "현재 페이지"}
            </label>
            <input
              type="number"
              min={0}
              max={isEbook ? 100 : undefined}
              className="mt-1 w-full rounded-sm border border-[#d9e2ef] px-2 py-1 text-sm"
              value={currentPage}
              onChange={(e) => setCurrentPage(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600">출판일</label>
          <input
            className="mt-1 w-full rounded-sm border border-[#d9e2ef] px-2 py-1 text-sm"
            value={publishedDate}
            onChange={(e) => setPublishedDate(e.target.value)}
            placeholder="2020"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600">상태</label>
          <select
            className="mt-1 w-full rounded-sm border border-[#d9e2ef] px-2 py-1 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as BookStatus)}
          >
            <option value="읽고싶음">읽고 싶음</option>
            <option value="읽는중">읽는 중</option>
            <option value="완독">완독</option>
          </select>
        </div>
        {/* 책등 이미지 — YES24 상품번호/URL 을 붙여넣으면 책장에 실제 책등이 표시됨 */}
        <div>
          <label className="block text-xs font-medium text-stone-600">
            책등 이미지 <span className="font-normal text-stone-400">(YES24)</span>
          </label>
          <input
            className={`mt-1 w-full rounded-sm border px-2 py-1 text-sm ${
              spineInvalid ? "border-[#e8112d]" : "border-[#d9e2ef]"
            }`}
            value={spineInput}
            onChange={(e) => setSpineInput(e.target.value)}
            placeholder="176223281 또는 YES24 링크 붙여넣기"
          />
          {spineInvalid ? (
            <p className="mt-1 text-[11px] text-y24red">
              인식할 수 없어요. YES24 상품번호나 상품/이미지 링크를 넣어주세요.
            </p>
          ) : (
            <p className="mt-1 text-[11px] leading-relaxed text-stone-400">
              YES24에서 이 책을 열고 주소의 숫자(예: m.yes24.com/goods/detail/
              <b className="text-stone-500">176223281</b>)만 넣어도 돼요.
            </p>
          )}
          {spinePreview && (
            <div className="mt-2 flex items-center gap-2">
              <img
                src={spinePreview}
                alt="책등 미리보기"
                className="h-24 w-auto rounded-[2px] shadow"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-ink">책등 이미지를 찾았어요</p>
                <button
                  onClick={() => setSpineInput("")}
                  className="mt-1 text-[11px] text-y24red hover:underline"
                >
                  지우기
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-sm border border-[#d9e2ef] px-3 py-1.5 text-sm text-stone-600">
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="bg-ink rounded-sm px-3.5 py-1.5 text-sm font-medium text-white"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
