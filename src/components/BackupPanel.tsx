import { useEffect, useState } from "react";
import { countsOf, downloadJson, readRaw } from "../lib/backup";
import {
  AUTO_EMAIL_ENABLED,
  EMAIL_RE,
  INTERVAL_LABEL,
  SETTINGS_EVENT,
  loadSettings,
  saveSettings,
  sendBackupEmail,
  serverConfigured,
  type AutoInterval,
} from "../lib/emailBackup";

function backupFileName() {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return `chaekgalpi-backup-${stamp}.json`;
}

/** 수동 백업(내려받기 · 공유 · 메일) + 자동 메일 백업 설정 */
export default function BackupPanel() {
  const [settings, setSettings] = useState(loadSettings);
  const [emailDraft, setEmailDraft] = useState(settings.email);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void serverConfigured().then(setConfigured);
    const onChange = () => setSettings(loadSettings());
    window.addEventListener(SETTINGS_EVENT, onChange);
    return () => window.removeEventListener(SETTINGS_EVENT, onChange);
  }, []);

  const raw = readRaw();
  const counts = countsOf(raw);
  const emailValid = EMAIL_RE.test(emailDraft.trim());
  const emailSaved = settings.email && settings.email === emailDraft.trim();
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [new File(["{}"], "t.json", { type: "application/json" })] });

  function saveEmail() {
    const email = emailDraft.trim();
    if (!EMAIL_RE.test(email)) {
      setMsg({ ok: false, text: "메일 주소 형식을 확인해 주세요." });
      return;
    }
    saveSettings({ email });
    setMsg({ ok: true, text: "메일 주소를 저장했습니다." });
  }

  async function emailNow(reason: "manual" | "test") {
    if (!raw) return;
    const to = emailDraft.trim();
    if (!EMAIL_RE.test(to)) {
      setMsg({ ok: false, text: "먼저 받을 메일 주소를 입력해 주세요." });
      return;
    }
    if (!emailSaved) saveSettings({ email: to });
    setBusy(reason);
    setMsg(null);
    try {
      await sendBackupEmail(raw, to, reason);
      setMsg({ ok: true, text: `${to} 로 백업 파일을 보냈습니다.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    if (!raw) return;
    try {
      const file = new File([raw], backupFileName(), { type: "application/json" });
      await navigator.share({ files: [file], title: "책갈피 백업" });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setMsg({ ok: false, text: "공유에 실패했습니다. '파일로 내려받기'를 이용해 주세요." });
      }
    }
  }

  const btn = "rounded px-3 py-2 text-xs font-semibold disabled:opacity-40";

  return (
    <div className="space-y-6">
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

      {/* 수동 백업 */}
      <section>
        <h2 className="mb-1 font-serif text-base font-bold text-ink">수동 백업</h2>
        <p className="mb-2 text-[11px] text-stone-500">
          지금 내용: 책 {counts.books}권 · 마인드맵 {counts.mindMaps}개 · 독후감 {counts.reviews}개
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            disabled={!raw}
            onClick={() => raw && downloadJson(raw, backupFileName())}
            className={`${btn} bg-emerald-700 text-white`}
          >
            파일로
            <br />
            내려받기
          </button>
          <button
            disabled={!raw || !canShare}
            onClick={share}
            className={`${btn} border border-stone-400 text-ink`}
            title={canShare ? "" : "이 브라우저는 파일 공유를 지원하지 않습니다"}
          >
            공유하기
            <br />
            <span className="font-normal text-stone-500">드라이브·카톡</span>
          </button>
          <button
            disabled={!raw || busy != null || configured === false}
            onClick={() => emailNow("manual")}
            className={`${btn} border border-stone-400 text-ink`}
          >
            {busy === "manual" ? "보내는 중…" : "메일로"}
            <br />
            <span className="font-normal text-stone-500">지금 보내기</span>
          </button>
        </div>
      </section>

      {/* 자동 메일 백업 */}
      <section>
        <h2 className="mb-1 font-serif text-base font-bold text-ink">
          {AUTO_EMAIL_ENABLED ? "자동 메일 백업" : "메일 받을 주소"}
        </h2>
        {AUTO_EMAIL_ENABLED && (
          <p className="mb-2 text-[11px] leading-relaxed text-stone-500">
            책 · 마인드맵 · 독후감이 추가되거나 바뀌면, 수정을 마친 뒤(2분간 변경이 없거나 앱을 닫을
            때) 아래 주소로 백업 파일을 자동으로 보냅니다.
          </p>
        )}

        {configured === false && (
          <p className="mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
            서버에 메일 발송 설정이 아직 없습니다. Vercel 환경변수 <code>GMAIL_USER</code>,{" "}
            <code>GMAIL_APP_PASSWORD</code> 를 등록하면 메일 백업이 동작합니다. (파일 내려받기 ·
            공유는 설정 없이 됩니다)
          </p>
        )}

        <label className="mb-1 block text-[11px] font-semibold text-stone-600">
          받을 메일 주소
        </label>
        <div className="flex gap-1.5">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            placeholder="example@gmail.com"
            className="min-w-0 flex-1 rounded border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-600"
          />
          <button
            onClick={saveEmail}
            disabled={!emailValid || Boolean(emailSaved)}
            className={`${btn} shrink-0 bg-ink text-white`}
          >
            {emailSaved ? "저장됨" : "저장"}
          </button>
        </div>

        {AUTO_EMAIL_ENABLED && (
          <>
            <label className="mt-3 flex items-center justify-between rounded border border-stone-200 px-3 py-2.5">
              <span className="text-sm font-semibold text-ink">자동 백업 메일 받기</span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-700"
                checked={settings.auto}
                disabled={!settings.email}
                onChange={(e) => {
                  setSettings(saveSettings({ auto: e.target.checked }));
                  setMsg({
                    ok: true,
                    text: e.target.checked
                      ? "자동 백업을 켰습니다. 내용이 바뀌면 메일로 보내드립니다."
                      : "자동 백업을 껐습니다.",
                  });
                }}
              />
            </label>
            {!settings.email && (
              <p className="mt-1 text-[11px] text-stone-400">
                메일 주소를 저장하면 켤 수 있습니다.
              </p>
            )}

            <div className="mt-2 space-y-1">
              {(Object.keys(INTERVAL_LABEL) as AutoInterval[]).map((k) => (
                <label key={k} className="flex items-center gap-2 text-xs text-stone-700">
                  <input
                    type="radio"
                    name="interval"
                    className="accent-emerald-700"
                    checked={settings.interval === k}
                    onChange={() => setSettings(saveSettings({ interval: k }))}
                  />
                  {INTERVAL_LABEL[k]}
                </label>
              ))}
            </div>

            <dl className="mt-3 rounded border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
              <div className="flex justify-between gap-3 py-0.5">
                <dt className="text-stone-500">마지막 발송</dt>
                <dd className="text-right font-medium text-ink">
                  {settings.lastSentAt
                    ? new Date(settings.lastSentAt).toLocaleString("ko-KR")
                    : "없음"}
                </dd>
              </div>
              {settings.lastError && (
                <div className="flex justify-between gap-3 py-0.5">
                  <dt className="shrink-0 text-stone-500">마지막 오류</dt>
                  <dd className="text-right font-medium text-red-600">{settings.lastError}</dd>
                </div>
              )}
            </dl>
          </>
        )}

        {AUTO_EMAIL_ENABLED && (
          <button
            disabled={!raw || busy != null || !emailValid || configured === false}
            onClick={() => emailNow("test")}
            className={`${btn} mt-2 border border-stone-300 text-stone-600`}
          >
            {busy === "test" ? "보내는 중…" : "테스트 메일 보내기"}
          </button>
        )}
      </section>
    </div>
  );
}
