/**
 * 메일 백업 (수동)
 *
 * 버튼을 누르면 입력한 주소로 백업 파일을 보낸다.
 * 실제 발송은 /api/backup-email (Gmail SMTP)이 한다.
 */

const EMAIL_KEY = "chaekgalpi-backup-email";

export const EMAIL_RE = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/;

export function loadEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveEmail(email: string) {
  try {
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    /* 주소 기억은 편의 기능이라 실패해도 넘어간다 */
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

/** 서버에 메일 발송 설정이 되어 있는지 (확인 실패 시 null) */
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

/** 백업 파일을 메일로 보낸다. 실패하면 Error를 던진다. */
export async function sendBackupEmail(json: string, to: string): Promise<void> {
  if (!EMAIL_RE.test(to)) throw new Error("메일 주소가 올바르지 않습니다.");
  const compressed = await gzip(json);
  const res = await fetch("/api/backup-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "x-backup-to": to,
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
}
