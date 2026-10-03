import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  countsOf,
  deleteSnapshot,
  downloadJson,
  formatBytes,
  listSnapshots,
  localStorageUsage,
  normalizeImport,
  readRaw,
  writeRaw,
  type KeyUsage,
  type Snapshot,
} from "../lib/backup";
import { lastStorageError } from "../lib/persistStorage";

const LS_LIMIT = 5 * 1024 * 1024; // 브라우저 공통 localStorage 한도(약 5MB)

export default function RecoverPage() {
  const [raw, setRaw] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ total: number; keys: KeyUsage[] }>({
    total: 0,
    keys: [],
  });
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [quota, setQuota] = useState<{ usage?: number; quota?: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setRaw(readRaw());
    setUsage(localStorageUsage());
    setSnapshots(await listSnapshots());
    try {
      if (navigator.storage?.estimate) setQuota(await navigator.storage.estimate());
    } catch {
      setQuota(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const current = countsOf(raw);

  function restore(json: string, label: string) {
    const c = countsOf(json);
    const ok = window.confirm(
      `${label}\n\n책 ${c.books}권 · 마인드맵 ${c.mindMaps}개 · 독후감 ${c.reviews}개\n\n` +
        `지금 저장된 내용(책 ${current.books}권)을 이것으로 덮어씁니다. 진행할까요?`
    );
    if (!ok) return;
    try {
      // 덮어쓰기 전에 현재 상태를 파일로 먼저 내려받아 둔다
      if (raw) downloadJson(raw, "책갈피-덮어쓰기전-백업.json");
      writeRaw(json);
      window.location.replace("/");
    } catch (e) {
      setNote(`복구 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      restore(normalizeImport(text), `백업 파일 "${file.name}" 에서 복구`);
    } catch (e) {
      setNote(`가져오기 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="min-h-screen bg-white px-5 py-6 text-stone-800">
      <header className="mb-5 border-b-2 border-ink pb-2">
        <p className="text-[9px] font-medium tracking-[0.4em] text-stone-500">DATA RESCUE</p>
        <h1 className="font-serif text-2xl font-black tracking-tight text-ink">
          데이터 점검 · 복구
        </h1>
        <Link to="/" className="mt-1 inline-block text-xs text-emerald-700 underline">
          ← 서재로 돌아가기
        </Link>
      </header>

      {note && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          {note}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-stone-500">확인 중…</p>
      ) : (
        <div className="space-y-6">
          {/* 1. 지금 저장된 내용 */}
          <section>
            <h2 className="mb-2 font-serif text-base font-bold text-ink">1. 지금 저장된 내용</h2>
            <dl className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
              <Row label="저장소 키" value="chaekgalpi-library" />
              <Row label="존재 여부" value={raw ? "있음" : "없음 (비어 있음)"} />
              <Row label="크기" value={raw ? formatBytes(raw.length * 2) : "-"} />
              <Row
                label="읽기 가능"
                value={raw ? (current.parsed ? "정상" : "깨짐 (JSON 파싱 실패)") : "-"}
              />
              <Row
                label="내용"
                value={`책 ${current.books}권 · 마인드맵 ${current.mindMaps}개 · 독후감 ${current.reviews}개`}
              />
            </dl>
            {current.titles.length > 0 && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">
                책 목록: {current.titles.join(", ")}
              </p>
            )}
            {raw && (
              <button
                onClick={() => downloadJson(raw)}
                className="mt-2 rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
              >
                지금 내용 백업 파일로 내려받기
              </button>
            )}
          </section>

          {/* 2. 자동 백업 스냅샷 */}
          <section>
            <h2 className="mb-2 font-serif text-base font-bold text-ink">
              2. 자동 백업 (IndexedDB)
            </h2>
            {snapshots.length === 0 ? (
              <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                백업 스냅샷이 없습니다. 자동 백업은 이번 업데이트부터 쌓이기 시작하므로, 그
                이전에 사라진 데이터는 이 목록에 남아 있지 않습니다.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {snapshots.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded border border-stone-200 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        책 {s.books}권 · 맵 {s.mindMaps} · 독후감 {s.reviews}
                      </p>
                      <p className="truncate text-[11px] text-stone-500">
                        {new Date(s.ts).toLocaleString("ko-KR")} · {formatBytes(s.size)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => downloadJson(s.json)}
                        className="rounded border border-stone-300 px-2 py-1 text-[11px]"
                      >
                        내려받기
                      </button>
                      <button
                        onClick={() =>
                          restore(
                            s.json,
                            `${new Date(s.ts).toLocaleString("ko-KR")} 백업으로 복구`
                          )
                        }
                        className="rounded bg-emerald-700 px-2 py-1 text-[11px] font-semibold text-white"
                      >
                        복구
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm("이 백업을 지울까요?")) return;
                          await deleteSnapshot(s.id);
                          void refresh();
                        }}
                        className="rounded border border-stone-300 px-2 py-1 text-[11px] text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 3. 파일에서 복구 */}
          <section>
            <h2 className="mb-2 font-serif text-base font-bold text-ink">3. 백업 파일에서 복구</h2>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded border border-stone-400 px-3 py-1.5 text-xs font-semibold text-ink"
            >
              백업 파일 선택 (.json)
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImport(f);
                e.target.value = "";
              }}
            />
          </section>

          {/* 4. 저장 공간 */}
          <section>
            <h2 className="mb-2 font-serif text-base font-bold text-ink">4. 저장 공간</h2>
            <dl className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
              <Row
                label="localStorage 사용량"
                value={`${formatBytes(usage.total)} / 약 ${formatBytes(LS_LIMIT)} (${Math.round(
                  (usage.total / LS_LIMIT) * 100
                )}%)`}
              />
              {quota?.usage != null && (
                <Row
                  label="브라우저 전체 할당량"
                  value={`${formatBytes(quota.usage)}${
                    quota.quota ? ` / ${formatBytes(quota.quota)}` : ""
                  }`}
                />
              )}
              <Row
                label="마지막 저장 실패"
                value={
                  lastStorageError
                    ? `${lastStorageError.name} — ${formatBytes(lastStorageError.bytes)} 쓰기 실패`
                    : "없음"
                }
              />
            </dl>
            {usage.total > LS_LIMIT * 0.8 && (
              <p className="mt-1.5 rounded border border-red-300 bg-red-50 px-3 py-2 text-[11px] leading-relaxed text-red-700">
                저장 공간이 거의 찼습니다. 사진 첨부(마인드맵 노드 · 독후감 구절)가 용량을 많이
                차지합니다. 사진을 줄이면 안전해집니다.
              </p>
            )}
            <ul className="mt-2 space-y-1 text-[11px] text-stone-500">
              {usage.keys.map((k) => (
                <li key={k.key} className="flex justify-between gap-2">
                  <span className="truncate">{k.key}</span>
                  <span className="shrink-0">{formatBytes(k.bytes)}</span>
                </li>
              ))}
            </ul>
          </section>

          <button
            onClick={() => void refresh()}
            className="rounded border border-stone-300 px-3 py-1.5 text-xs text-stone-600"
          >
            ↻ 다시 확인
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-stone-200/70 py-1 last:border-0">
      <dt className="shrink-0 text-stone-500">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
