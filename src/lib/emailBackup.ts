/**
 * 메일 백업
 *
 * - 수동: 버튼을 누르면 지정한 주소로 백업 파일을 보낸다.
 * - 자동: 책/마인드맵/독후감이 바뀌면, 변경이 잠잠해진 뒤(또는 앱을 닫을 때)
 *   지정한 주소로 백업 파일을 보낸다. 메일함이 넘치지 않도록 최소 간격을 둔다.
 *
 * 실제 발송은 /api/backup-email (Gmail SMTP)이 한다.
 */

import { countsOf, looksLikeSeed, readRaw } from "./backup";

const SETTINGS_KEY = "chaekgalpi-backup-settings";

export type AutoInterval = "change" | "hourly" | "daily";

export const INTERVAL_LABEL: Record<AutoInterval, string> = {
  change: "변경할 때마다 (최소 10분 간격)",
  hourly: "변경 시 · 1시간에 최대 1번",
  daily: "변경 시 · 하루에 최대 1번",
};

/** 같은 내용을 다시 보내지 않기 위한 최소 간격 */
const MIN_GAP: Record<AutoInterval, number> = {
  change: 10 * 60_000,
  hourly: 60 * 60_000,
  daily: 24 * 60 * 60_000,
};

/** 마지막 변경 후 이 시간 동안 추가 변경이 없으면 발송 */
const SETTLE_MS = 2 * 60_000;

export interface BackupSettings {
  email: string;
  auto: boolean;
  interval: AutoInterval;
  lastSentAt?: string;
  lastSentHash?: string;
  lastError?: string;
  lastErrorAt?: string;
}

export const SETTINGS_EVENT = "chaekgalpi:backup-settings";

export function loadSettings(): BackupSettings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
    return {
      email: typeof s.email === "string" ? s.email : "",
      auto: Boolean(s.auto),
      interval: s.interval in MIN_GAP ? s.interval : "change",
      lastSentAt: s.lastSentAt,
      lastSentHash: s.lastSentHash,
      lastError: s.lastError,
      lastErrorAt: s.lastErrorAt,
    };
  } catch {
    return { email: "", auto: false, interval: "change" };
  }
}

export function saveSettings(patch: Partial<BackupSettings>): BackupSettings {
  const next = { ...loadSettings(), ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* 설정은 작아서 실패할 일이 거의 없다 */
  }
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
  if (patch.auto || patch.email || patch.interval) scheduleCheck(1000);
  return next;
}

export const EMAIL_RE = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/;

/* ------------------------------------------------------------------ */
/* 발송                                                               */
/* ------------------------------------------------------------------ */

async function hashOf(text: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .slice(0, 12)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // subtle을 못 쓰는 환경(비보안 컨텍스트)용 간단 해시
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return `${(h >>> 0).toString(16)}-${text.length}`;
  }
}

async function gzip(text: string): Promise<Blob | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    return await new Response(stream).blob();
  } catch {
    return null;
  }
}

export async function serverConfigured(): Promise<boolean | null> {
  try {
    const r = await fetch("/api/backup-email", { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    return Boolean(j.configured);
  } catch {
    return null;
  }
}

let sending = false;

/** 백업 파일을 메일로 보낸다. 실패하면 Error를 던진다. */
export async function sendBackupEmail(
  json: string,
  to: string,
  reason: "manual" | "auto" | "test"
): Promise<void> {
  if (!EMAIL_RE.test(to)) throw new Error("메일 주소가 올바르지 않습니다.");
  const compressed = await gzip(json);
  const res = await fetch("/api/backup-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "x-backup-to": to,
      "x-backup-reason": reason,
      "x-backup-encoding": compressed ? "gzip" : "identity",
    },
    body: compressed ?? new Blob([json]),
  });
  let body: { ok?: boolean; error?: string } = {};
  try {
    body = await res.json();
  } catch {
    /* 본문이 JSON이 아닐 때 */
  }
  if (!res.ok || !body.ok) {
    if (res.status === 413) throw new Error("백업 파일이 너무 큽니다 (사진을 줄여 주세요).");
    throw new Error(body.error ?? `발송 실패 (HTTP ${res.status})`);
  }
  const hash = await hashOf(json);
  saveSettings({
    lastSentAt: new Date().toISOString(),
    lastSentHash: hash,
    lastError: undefined,
    lastErrorAt: undefined,
  });
}

/* ------------------------------------------------------------------ */
/* 자동 발송 스케줄러                                                  */
/* ------------------------------------------------------------------ */

let latestJson: string | null = null;
let lastChangeAt = 0;
let timer: number | null = null;

function scheduleCheck(delay: number) {
  if (typeof window === "undefined") return;
  if (timer != null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void runAuto(false);
  }, Math.max(0, delay));
}

/**
 * 자동 발송 조건을 확인하고, 맞으면 보낸다.
 * @param leaving 앱을 닫거나 백그라운드로 보낼 때 — 잠잠해질 때까지 기다리지 않는다
 */
async function runAuto(leaving: boolean) {
  const s = loadSettings();
  if (!s.auto || !EMAIL_RE.test(s.email) || sending) return;
  if (!navigator.onLine) return;

  const json = latestJson ?? readRaw();
  if (!json) return;
  const counts = countsOf(json);
  // 비었거나 예시 데이터뿐인 상태는 보내지 않는다 (좋은 백업을 헷갈리게 만든다)
  if (!counts.parsed || looksLikeSeed(counts)) return;

  const hash = await hashOf(json);
  if (hash === s.lastSentHash) return; // 이미 보낸 내용

  const now = Date.now();
  if (!leaving) {
    const settleLeft = lastChangeAt + SETTLE_MS - now;
    if (settleLeft > 0) {
      scheduleCheck(settleLeft + 500);
      return;
    }
  }
  const gapLeft = (s.lastSentAt ? Date.parse(s.lastSentAt) : 0) + MIN_GAP[s.interval] - now;
  if (gapLeft > 0) {
    if (!leaving) scheduleCheck(gapLeft + 500);
    return;
  }

  // 실패가 이어질 때 계속 두드리지 않도록 5분은 쉰다
  if (s.lastErrorAt && now - Date.parse(s.lastErrorAt) < 5 * 60_000 && !leaving) {
    scheduleCheck(5 * 60_000);
    return;
  }

  sending = true;
  try {
    await sendBackupEmail(json, s.email, "auto");
  } catch (e) {
    saveSettings({
      lastError: e instanceof Error ? e.message : String(e),
      lastErrorAt: new Date().toISOString(),
    });
    scheduleCheck(5 * 60_000 + 500); // 잠시 뒤 다시 시도
  } finally {
    sending = false;
  }
}

/** 저장될 때마다 호출된다 (persistStorage) */
export function notifyDataChanged(json: string) {
  latestJson = json;
  lastChangeAt = Date.now();
  if (loadSettings().auto) scheduleCheck(SETTLE_MS + 500);
}

if (typeof window !== "undefined") {
  // 앱을 열었을 때: 지난번에 못 보낸 변경이 있으면 보낸다
  window.setTimeout(() => void runAuto(false), 15_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void runAuto(true);
  });
  window.addEventListener("online", () => scheduleCheck(5_000));
}
