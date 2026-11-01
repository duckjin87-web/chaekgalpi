import { useEffect, useState } from "react";
import { countsOf, downloadJson, readRaw } from "../lib/backup";
import {
  EMAIL_RE,
  loadEmail,
  saveEmail,
  sendBackupEmail,
  serverConfigured,
} from "../lib/emailBackup";

/** 수동 백업: 파일로 내려받기 + 메일로 보내기 */
export default function BackupPanel() {
  const [email, setEmail] = useState(loadEmail);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void serverConfigured().then(setConfigured);
  }, []);

  const raw = readRaw();
  const counts = countsOf(raw);
  const emailValid = EMAIL_RE.test(email.trim());

  async function send() {
    if (!raw) return;
    const to = email.trim();
    if (!EMAIL_RE.test(to)) {
      setMsg({ ok: false, text: "메일 주소 형식을 확인해 주세요." });
      return;
    }
    saveEmail(to); // 다음에 다시 입력하지 않도록 기억
    setSending(true);
    setMsg(null);
    try {
      await sendBackupEmail(raw, to);
      setMsg({ ok: true, text: `${to} 로 백업 파일을 보냈습니다.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSending(false);
    }
  }

  const btn = "rounded px-3 py-2.5 text-sm font-semibold disabled:opacity-40";

  return (
    <div className="space-y-6">
      <p className="text-[11px] text-stone-500">
        지금 내용: 책 {counts.books}권 · 마인드맵 {counts.mindMaps}개 · 독후감 {counts.reviews}개
      </p>

      {msg && (
        <p
          className={`rounded border px-3 py-2 text-xs ${
            msg.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* 데이터 내려받기 */}
      <section>
        <h2 className="mb-2 font-serif text-base font-bold text-ink">데이터 내려받기</h2>
        <button
          disabled={!raw}
          onClick={() => raw && downloadJson(raw)}
          className={`${btn} w-full bg-emerald-700 text-white`}
        >
          백업 파일 내려받기 (.json)
        </button>
      </section>

      {/* 메일로 발송하기 */}
      <section>
        <h2 className="mb-2 font-serif text-base font-bold text-ink">메일로 발송하기</h2>
        {configured === false && (
          <p className="mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
            서버에 메일 발송 설정이 아직 없습니다. Vercel 환경변수 <code>GMAIL_USER</code>,{" "}
            <code>GMAIL_APP_PASSWORD</code> 를 등록하면 메일 발송이 동작합니다.
          </p>
        )}
        <label className="mb-1 block text-[11px] font-semibold text-stone-600">받을 메일 주소</label>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@gmail.com"
          className="w-full rounded border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-600"
        />
        <button
          disabled={!raw || !emailValid || sending || configured === false}
          onClick={send}
          className={`${btn} mt-2 w-full border border-ink text-ink`}
        >
          {sending ? "보내는 중…" : "메일로 보내기"}
        </button>
      </section>
    </div>
  );
}
