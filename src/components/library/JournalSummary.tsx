import { useMemo } from "react";
import type { Book, MindMap } from "../../types";
import TLink from "../common/TLink";
import { percentToPage } from "../../lib/progress";

interface JournalSummaryProps {
  books: Book[];
  mindMaps: MindMap[];
  /** 가장 최근에 기록한 '읽는 중' 책 */
  current?: Book;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function finishedAt(b: Book): Date | null {
  if (b.status !== "완독") return null;
  return new Date(b.finishDate ?? b.createdAt);
}

function progressOf(b: Book): { percent: number; left: string | null } {
  const isEbook = b.bookType === "전자책";
  const total = isEbook ? 100 : b.pageCount ?? 0;
  const cur = b.currentPage ?? 0;
  if (total <= 0) return { percent: 0, left: null };
  const percent = Math.min(100, Math.round((cur / total) * 100));
  if (percent >= 100) return { percent, left: null };
  if (isEbook) {
    return {
      percent,
      left: b.pageCount ? `약 ${b.pageCount - percentToPage(cur, b.pageCount)}쪽 남음` : `${100 - percent}% 남음`,
    };
  }
  return { percent, left: `${Math.max(0, total - cur)}쪽 남음` };
}

/** 저널형 요약: 지금 읽는 책 · 이번 달 완독 · 마인드맵 기록 · 월별 완독 그래프 */
export default function JournalSummary({ books, mindMaps, current }: JournalSummaryProps) {
  const now = new Date();

  const stats = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { y: d.getFullYear(), m: d.getMonth(), count: 0 };
    });
    let thisYear = 0;
    for (const b of books) {
      const d = finishedAt(b);
      if (!d || Number.isNaN(d.getTime())) continue;
      if (d.getFullYear() === now.getFullYear()) thisYear += 1;
      const slot = months.find((s) => s.y === d.getFullYear() && s.m === d.getMonth());
      if (slot) slot.count += 1;
    }
    const thisMonth = months[5].count;
    const lastMonth = months[4].count;
    const nodeCount = mindMaps.reduce((s, m) => s + m.nodes.length, 0);
    const mappedBooks = mindMaps.filter((m) => m.nodes.length > 1).length;
    return { months, thisYear, thisMonth, lastMonth, nodeCount, mappedBooks };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, mindMaps]);

  const max = Math.max(1, ...stats.months.map((m) => m.count));
  const diff = stats.thisMonth - stats.lastMonth;
  const diffLabel =
    diff > 0 ? `지난달보다 ${diff}권 많음` : diff < 0 ? `지난달보다 ${-diff}권 적음` : "지난달과 같음";

  const prog = current ? progressOf(current) : null;
  const days = current
    ? Math.max(1, Math.floor((Date.now() - new Date(current.startDate ?? current.createdAt).getTime()) / DAY_MS) + 1)
    : 0;

  return (
    <div className="journal-summary flex flex-col gap-3">
      {current && prog && (
        <TLink to={`/book/${current.id}`} className="paper-card block rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-emerald-600">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M4 5.5c2.6-.9 5.3-.6 8 1.2 2.7-1.8 5.4-2.1 8-1.2v13c-2.6-.9-5.3-.6-8 1.2-2.7-1.8-5.4-2.1-8-1.2z" />
            </svg>
            <span className="flex-1">지금 읽는 중</span>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.6" strokeLinecap="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="mt-3 flex items-center gap-3.5">
            <div data-cover className="h-[76px] w-[52px] flex-none overflow-hidden rounded bg-stone-300 shadow-md">
              {current.coverUrl && <img src={current.coverUrl} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[17px] font-semibold text-stone-900">{current.title}</span>
              <span className="truncate text-[13px] text-stone-500">
                {current.author} · {days}일째
              </span>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-[28px] font-bold leading-tight tracking-tight text-stone-900">{prog.percent}</span>
                <span className="text-[15px] font-semibold text-stone-500">%</span>
                {prog.left && <span className="ml-1.5 text-[13px] text-stone-500">{prog.left}</span>}
              </div>
            </div>
          </div>
        </TLink>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="paper-card flex flex-col gap-1 rounded-2xl p-4">
          <span className="text-[13px] font-semibold text-amber-600">이번 달 완독</span>
          <span className="flex items-baseline gap-0.5">
            <span className="text-[28px] font-bold leading-tight text-stone-900">{stats.thisMonth}</span>
            <span className="text-[15px] font-semibold text-stone-500">권</span>
          </span>
          <span className="text-xs text-stone-500">{diffLabel}</span>
        </div>
        <div className="paper-card flex flex-col gap-1 rounded-2xl p-4">
          <span className="text-[13px] font-semibold" style={{ color: "#a855c7" }}>
            마인드맵 노드
          </span>
          <span className="flex items-baseline gap-0.5">
            <span className="text-[28px] font-bold leading-tight text-stone-900">{stats.nodeCount}</span>
            <span className="text-[15px] font-semibold text-stone-500">개</span>
          </span>
          <span className="text-xs text-stone-500">책 {stats.mappedBooks}권에 기록</span>
        </div>
      </div>

      <div className="paper-card flex flex-col gap-3 rounded-2xl p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-semibold text-stone-900">월별 완독</span>
          <span className="text-[13px] text-stone-500">
            {now.getFullYear()}년 · {stats.thisYear}권
          </span>
        </div>
        <div className="grid h-[96px] grid-cols-6 items-end gap-2.5" role="img" aria-label={`최근 6개월 완독: ${stats.months.map((m) => `${m.m + 1}월 ${m.count}권`).join(", ")}`}>
          {stats.months.map((m, i) => {
            const last = i === stats.months.length - 1;
            return (
              <div key={`${m.y}-${m.m}`} className="flex h-full flex-col items-center justify-end gap-1">
                <span className={`text-[11px] font-semibold ${m.count ? "text-stone-600" : "text-transparent"}`}>{m.count}</span>
                <div
                  className={`w-full rounded ${last ? "bg-emerald-600" : "bg-stone-300"}`}
                  style={{ height: `${Math.max(4, (m.count / max) * 56)}px` }}
                />
                <span className={`text-[11px] ${last ? "font-semibold text-stone-900" : "text-stone-500"}`}>{m.m + 1}월</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
