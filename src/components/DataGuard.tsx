import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { countsOf, looksLikeSeed, readRaw, richestSnapshot, writeRaw } from "../lib/backup";
import { STORAGE_ERROR_EVENT, type StorageErrorDetail } from "../lib/persistStorage";

/**
 * 데이터 안전장치.
 * - 저장된 책이 비었는데 자동 백업에 더 많은 책이 남아 있으면 복구를 권한다.
 * - localStorage 쓰기가 실패하면(용량 초과 등) 조용히 넘기지 않고 알린다.
 */
export default function DataGuard() {
  const [recoverable, setRecoverable] = useState<{ ts: string; books: number; json: string } | null>(
    null
  );
  const [dismissed, setDismissed] = useState(false);
  const [storageError, setStorageError] = useState<StorageErrorDetail | null>(null);

  useEffect(() => {
    const onError = (e: Event) =>
      setStorageError((e as CustomEvent<StorageErrorDetail>).detail ?? null);
    window.addEventListener(STORAGE_ERROR_EVENT, onError);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, onError);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const current = countsOf(readRaw());
      // 지금 데이터가 비었거나 예시 데이터뿐일 때만 제안한다
      if (current.books > 2 || !looksLikeSeed(current)) return;
      const best = await richestSnapshot();
      if (!alive || !best || best.books <= current.books) return;
      setRecoverable({ ts: best.ts, books: best.books, json: best.json });
    })();
    return () => {
      alive = false;
    };
  }, []);

  function restore() {
    if (!recoverable) return;
    try {
      writeRaw(recoverable.json);
      window.location.replace("/");
    } catch {
      alert("복구에 실패했습니다. 데이터 점검 화면에서 다시 시도해 주세요.");
    }
  }

  if (storageError) {
    return (
      <Banner tone="red" onClose={() => setStorageError(null)}>
        <p className="font-semibold">저장 공간이 꽉 찼습니다 — 방금 변경한 내용이 저장되지 않았어요.</p>
        <p className="mt-0.5 opacity-90">
          사진 첨부가 용량을 많이 차지합니다.{" "}
          <Link to="/recover" className="underline">
            데이터 점검
          </Link>{" "}
          에서 백업을 내려받고 정리해 주세요.
        </p>
      </Banner>
    );
  }

  if (!recoverable || dismissed) return null;

  return (
    <Banner tone="emerald" onClose={() => setDismissed(true)}>
      <p className="font-semibold">
        자동 백업에 책 {recoverable.books}권이 남아 있습니다.
      </p>
      <p className="mt-0.5 opacity-90">
        {new Date(recoverable.ts).toLocaleString("ko-KR")} 기준 백업입니다.
      </p>
      <div className="mt-1.5 flex gap-2">
        <button
          onClick={restore}
          className="rounded bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800"
        >
          복구하기
        </button>
        <Link
          to="/recover"
          className="rounded border border-white/60 px-2.5 py-1 text-[11px] font-semibold"
        >
          자세히 보기
        </Link>
      </div>
    </Banner>
  );
}

function Banner({
  tone,
  onClose,
  children,
}: {
  tone: "red" | "emerald";
  onClose: () => void;
  children: React.ReactNode;
}) {
  const bg = tone === "red" ? "bg-red-700" : "bg-emerald-800";
  return (
    <div
      className={`fixed inset-x-2 bottom-2 z-[60] flex items-start gap-2 rounded-lg ${bg} px-3 py-2.5 text-[12px] leading-snug text-white shadow-2xl`}
      role="status"
    >
      <div className="min-w-0 flex-1">{children}</div>
      <button
        onClick={onClose}
        className="shrink-0 rounded px-1 text-base leading-none opacity-70"
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  );
}
