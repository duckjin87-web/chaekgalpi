import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Book } from "../../types";
import { getDailyRecommendations, type BookRec } from "../../lib/recommendations";
import { fetchSpineUrl } from "../../lib/bookSpine";
import { useLibraryStore } from "../../store/useLibraryStore";

interface ThreeTierShelfProps {
  recentBooks: Book[];
  oldBooks: Book[];
  allBooks: Book[];
}

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SPINE_STYLES: { bg: string; fg: string }[] = [
  { bg: "#1c2340", fg: "#e5dcbf" },
  { bg: "#e8dcb5", fg: "#2a2620" },
  { bg: "#7f8a99", fg: "#f4f0e5" },
  { bg: "#1a1a1a", fg: "#e5dcbf" },
  { bg: "#eae4d0", fg: "#2a2620" },
  { bg: "#3a4258", fg: "#e5dcbf" },
  { bg: "#b09779", fg: "#2a2620" },
  { bg: "#2c3a30", fg: "#e5dcbf" },
  { bg: "#6b2f2a", fg: "#e5dcbf" },
  { bg: "#4a3a5a", fg: "#e5dcbf" },
];

const SPINE_HEIGHT_PX = 280;
/** 책등 조회 로직 버전. 올리면 저장된 책등 결과를 버리고 다시 조회한다. */
const SPINE_V = 5;

/** 제목 길이에 따른 책등 두께 (색상 책등 폴백용) */
function spineWidth(title: string): number {
  const len = Math.min(title.length, 18);
  return 46 + Math.round(len * 2.1);
}
function spineFontSize(title: string): number {
  const usable = SPINE_HEIGHT_PX - 34;
  const perChar = usable / title.length;
  return Math.max(11, Math.min(22, Math.round(perChar / 1.05)));
}

/** 실제 YES24 책등 이미지. 없으면 색상 책등으로 폴백 */
function BookSpineFromBook({ book }: { book: Book }) {
  const h = stableHash(book.id);
  const style = SPINE_STYLES[h % SPINE_STYLES.length];
  const rotate = ((h % 5) - 2) * 0.35;
  const [imgFailed, setImgFailed] = useState(false);
  const useRealSpine = !!book.spineUrl && !imgFailed;

  const shared = {
    transform: `rotate(${rotate}deg)`,
    transformOrigin: "bottom center" as const,
  };

  if (useRealSpine) {
    return (
      <Link
        to={`/book/${book.id}`}
        className="relative block flex-shrink-0 overflow-hidden rounded-[2px] shadow-[1px_3px_5px_-2px_rgba(20,10,5,0.5)] transition-transform hover:-translate-y-1"
        style={shared}
        title={`${book.title}${book.author ? ` — ${book.author}` : ""}`}
      >
        <img
          src={book.spineUrl}
          alt={book.title}
          className="block w-auto"
          style={{ height: SPINE_HEIGHT_PX }}
          onError={() => setImgFailed(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        {/* 입체감: 좌우 미세 음영 */}
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.22) 0%, rgba(255,255,255,0.10) 10%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.06) 88%, rgba(0,0,0,0.26) 100%)",
          }}
        />
      </Link>
    );
  }

  return (
    <Link
      to={`/book/${book.id}`}
      className="book-spine group flex flex-shrink-0 flex-col items-center justify-start transition-transform hover:-translate-y-1"
      style={{
        ...shared,
        width: spineWidth(book.title),
        height: SPINE_HEIGHT_PX,
        backgroundColor: style.bg,
        color: style.fg,
      }}
      title={`${book.title}${book.author ? ` — ${book.author}` : ""}`}
    >
      <span className="book-spine-title" style={{ fontSize: spineFontSize(book.title) }}>
        {book.title}
      </span>
    </Link>
  );
}

function BookSpineFromRec({
  rec,
  idx,
  spineUrl,
}: {
  rec: BookRec;
  idx: number;
  spineUrl?: string;
}) {
  const h = stableHash(rec.title);
  const style = SPINE_STYLES[(h + idx) % SPINE_STYLES.length];
  const rotate = ((h % 5) - 2) * 0.35;
  const [imgFailed, setImgFailed] = useState(false);

  if (spineUrl && !imgFailed) {
    return (
      <div
        className="relative block flex-shrink-0 overflow-hidden rounded-[2px] shadow-[1px_3px_5px_-2px_rgba(20,10,5,0.5)]"
        style={{ transform: `rotate(${rotate}deg)`, transformOrigin: "bottom center" }}
        title={`${rec.title} — ${rec.author} · ${rec.genre}`}
      >
        <img
          src={spineUrl}
          alt={rec.title}
          className="block w-auto"
          style={{ height: SPINE_HEIGHT_PX }}
          onError={() => setImgFailed(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.22) 0%, rgba(255,255,255,0.10) 10%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.06) 88%, rgba(0,0,0,0.26) 100%)",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="book-spine flex flex-shrink-0 flex-col items-center justify-start"
      style={{
        width: spineWidth(rec.title),
        height: SPINE_HEIGHT_PX,
        backgroundColor: style.bg,
        color: style.fg,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "bottom center",
      }}
      title={`${rec.title} — ${rec.author} · ${rec.genre}`}
    >
      <span className="book-spine-title" style={{ fontSize: spineFontSize(rec.title) }}>
        {rec.title}
      </span>
    </div>
  );
}

/** 추천 도서 책등 캐시 (제목 → URL|null). localStorage 에 보관 */
const REC_CACHE_KEY = "chaekgalpi-rec-spines";
function loadRecCache(): Record<string, string | null> {
  try {
    return JSON.parse(localStorage.getItem(REC_CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveRecCache(c: Record<string, string | null>) {
  try {
    localStorage.setItem(REC_CACHE_KEY, JSON.stringify(c));
  } catch {
    /* 저장 실패는 무시 */
  }
}

interface TierProps {
  label: string;
  children: React.ReactNode;
}
function Tier({ label, children }: TierProps) {
  return (
    <div className="wood-panel relative">
      <div className="flex h-[320px] items-end gap-[3px] overflow-x-auto overflow-y-hidden px-3 pb-[12px] pt-2">
        {children}
      </div>
      <span className="wood-label pointer-events-none absolute left-2 top-1">{label}</span>
      <div className="wood-plank absolute inset-x-1 bottom-0 h-[12px]" />
    </div>
  );
}

export default function ThreeTierShelf({ recentBooks, oldBooks, allBooks }: ThreeTierShelfProps) {
  const recs = getDailyRecommendations(allBooks);
  const updateBook = useLibraryStore((s) => s.updateBook);
  const inFlightRef = useRef<Set<string>>(new Set());
  const [recSpines, setRecSpines] = useState<Record<string, string | null>>(loadRecCache);

  // 추천 책(2단)도 제목으로 실제 책등을 찾아 채운다 (한 번 찾으면 캐시)
  useEffect(() => {
    const missing = recs.filter((r) => !(r.title in recSpines));
    if (missing.length === 0) return;
    let cancelled = false;

    (async () => {
      const next: Record<string, string | null> = {};
      for (const r of missing) {
        const { spineUrl, definitive } = await fetchSpineUrl(undefined, r.title);
        if (cancelled) return;
        // 통신 실패면 캐시에 넣지 않아 다음에 다시 시도
        if (definitive || spineUrl) next[r.title] = spineUrl;
      }
      if (cancelled || Object.keys(next).length === 0) return;
      setRecSpines((prev) => {
        const merged = { ...prev, ...next };
        saveRecCache(merged);
        return merged;
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recs.map((r) => r.title).join("|")]);

  // 아직 조회하지 않은 책의 책등을 자동으로 채운다 (동시 2건).
  // 자동으로 못 찾은 책은 '정보 수정'에서 YES24 상품번호를 직접 넣을 수 있다.
  useEffect(() => {
    const pending = allBooks.filter(
      (b) =>
        (b.isbn || b.title) &&
        (b.spineV !== SPINE_V || !b.spineChecked) &&
        !inFlightRef.current.has(b.id)
    );
    if (pending.length === 0) return;

    let cancelled = false;
    const queue = [...pending];

    async function worker() {
      while (!cancelled) {
        const book = queue.shift();
        if (!book) return;
        inFlightRef.current.add(book.id);
        const { spineUrl, definitive } = await fetchSpineUrl(book.isbn, book.title);
        if (cancelled) return;

        // 통신 실패(definitive=false)면 아무것도 기록하지 않는다.
        // → '조회 완료'로 굳지 않고, 다음에 앱을 열 때 다시 시도한다.
        if (!definitive && !spineUrl) continue;

        updateBook(book.id, {
          // 수동으로 지정해 둔 책등이 있으면 덮어쓰지 않는다
          spineUrl: book.spineUrl ?? spineUrl ?? undefined,
          spineChecked: true,
          spineV: SPINE_V,
        });
      }
    }
    void worker();
    void worker();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBooks.map((b) => `${b.id}:${b.spineV ?? 0}:${b.spineChecked ? 1 : 0}`).join(",")]);

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-baseline gap-2 px-1">
        <h2 className="font-serif text-base font-bold text-ink">나의 서재 · 3단 책장</h2>
        <span className="text-[9px] tracking-[0.25em] text-stone-400">LIBRARY SHELF</span>
      </div>

      <div className="wood-frame overflow-hidden rounded-md p-2">
        <div className="flex flex-col gap-1">
          <Tier label="1단 · 읽은 책 (~6개월)">
            {recentBooks.length > 0 ? (
              recentBooks.map((b) => <BookSpineFromBook key={b.id} book={b} />)
            ) : (
              <p className="w-full py-16 text-center text-[13px] italic text-stone-100/60">
                최근 6개월 안에 완독한 책이 없어요
              </p>
            )}
          </Tier>

          <Tier label="2단 · 추천 책">
            {recs.map((r, i) => (
              <BookSpineFromRec
                key={`${r.title}-${i}`}
                rec={r}
                idx={i}
                spineUrl={recSpines[r.title] ?? undefined}
              />
            ))}
          </Tier>

          <Tier label="3단 · 이전에 읽은 책 (6개월+)">
            {oldBooks.length > 0 ? (
              oldBooks.map((b) => <BookSpineFromBook key={b.id} book={b} />)
            ) : (
              <p className="w-full py-16 text-center text-[13px] italic text-stone-100/60">
                6개월 이상 지난 완독 책이 없어요
              </p>
            )}
          </Tier>
        </div>
      </div>
    </section>
  );
}
