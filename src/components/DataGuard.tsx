import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { STORAGE_ERROR_EVENT, type StorageErrorDetail } from "../lib/persistStorage";

/** localStorage 쓰기가 실패하면(용량 초과 등) 조용히 넘기지 않고 알린다. */
export default function DataGuard() {
  const [storageError, setStorageError] = useState<StorageErrorDetail | null>(null);

  useEffect(() => {
    const onError = (e: Event) =>
      setStorageError((e as CustomEvent<StorageErrorDetail>).detail ?? null);
    window.addEventListener(STORAGE_ERROR_EVENT, onError);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, onError);
  }, []);

  if (!storageError) return null;

  return (
    <div
      className="fixed inset-x-2 bottom-2 z-[60] flex items-start gap-2 rounded-lg bg-red-700 px-3 py-2.5 text-[12px] leading-snug text-white shadow-2xl"
      role="status"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          저장 공간이 꽉 찼습니다 — 방금 변경한 내용이 저장되지 않았어요.
        </p>
        <p className="mt-0.5 opacity-90">
          사진 첨부가 용량을 많이 차지합니다.{" "}
          <Link to="/recover" className="underline">
            백업
          </Link>
          에서 파일을 내려받아 두고 사진을 정리해 주세요.
        </p>
      </div>
      <button
        onClick={() => setStorageError(null)}
        className="shrink-0 rounded px-1 text-base leading-none opacity-70"
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  );
}
