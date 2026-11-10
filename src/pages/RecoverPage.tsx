import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { countsOf, downloadJson, normalizeImport, readRaw, writeRaw } from "../lib/backup";
import BackupPanel from "../components/BackupPanel";

export default function RecoverPage() {
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport(file: File) {
    try {
      const json = normalizeImport(await file.text());
      const c = countsOf(json);
      const current = countsOf(readRaw());
      const ok = window.confirm(
        `백업 파일 "${file.name}"\n\n책 ${c.books}권 · 마인드맵 ${c.mindMaps}개 · 독후감 ${c.reviews}개\n\n` +
          `지금 저장된 내용(책 ${current.books}권)을 이것으로 덮어씁니다. 진행할까요?`
      );
      if (!ok) return;
      // 덮어쓰기 전에 현재 상태를 파일로 먼저 내려받아 둔다
      const raw = readRaw();
      if (raw) downloadJson(raw, "chaekgalpi-before-restore.json");
      writeRaw(json);
      window.location.replace("/");
    } catch (e) {
      setNote(`복구 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="paper-texture min-h-screen px-5 pb-28 pt-6 text-stone-800">
      <header className="mb-5 border-b-2 border-ink pb-2">
        <p className="text-[9px] font-medium tracking-[0.4em] text-stone-500">BACKUP</p>
        <h1 className="font-serif text-2xl font-black tracking-tight text-ink">백업</h1>
        <Link to="/" className="mt-1 inline-block text-xs text-emerald-700 underline">
          ← 서재로 돌아가기
        </Link>
      </header>

      <BackupPanel />

      <section className="mt-8 border-t border-stone-200 pt-5">
        <h2 className="mb-1 font-serif text-base font-bold text-ink">백업 파일에서 복구</h2>
        <p className="mb-2 text-[11px] text-stone-500">
          내려받거나 메일로 받은 .json 파일로 데이터를 되돌립니다.
        </p>
        {note && (
          <p className="mb-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            {note}
          </p>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded border border-stone-400 px-3 py-1.5 text-xs font-semibold text-ink"
        >
          백업 파일 선택
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
    </div>
  );
}
