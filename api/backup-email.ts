/**
 * Vercel 서버리스 함수: 책갈피 백업 파일을 메일로 보낸다.
 *
 * 브라우저에서는 첨부파일이 달린 메일을 직접 보낼 수 없어서 서버를 거친다.
 * Gmail SMTP(앱 비밀번호)로 발송하며, Vercel 환경변수가 필요하다:
 *   GMAIL_USER           보내는 Gmail 주소 (예: me@gmail.com)
 *   GMAIL_APP_PASSWORD   Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호 (16자리)
 *   BACKUP_ALLOWED_TO    (선택) 받을 수 있는 주소 목록, 쉼표 구분. 지정하면 그 외 주소로는 보내지 않는다.
 *
 * 사용:
 *   GET  /api/backup-email                 → { configured: boolean }
 *   POST /api/backup-email
 *        헤더  x-backup-to: 받는 주소
 *              x-backup-encoding: gzip | identity
 *        본문  저장 데이터(JSON) — gzip 이면 압축된 바이트
 *   응답: { ok: true } | { ok: false, error }
 */

import nodemailer from "nodemailer";
import { gunzipSync } from "node:zlib";

const MAX_BODY = 4_400_000; // Vercel 요청 본문 한도(4.5MB) 바로 아래
const MAX_JSON = 25_000_000; // 압축 해제 후 허용 크기
const EMAIL_RE = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/;

function json(res: any, status: number, body: unknown) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

async function readBody(req: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > MAX_BODY) throw new Error("백업 파일이 너무 큽니다 (사진을 줄여 주세요)");
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

function seoulStamp(d = new Date()) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    label: `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`,
    file: `${get("year")}${get("month")}${get("day")}-${get("hour")}${get("minute")}`,
  };
}

export default async function handler(req: any, res: any) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  const configured = Boolean(user && pass);

  if (req.method === "GET") {
    json(res, 200, { configured });
    return;
  }
  if (req.method !== "POST") {
    json(res, 405, { ok: false, error: "POST만 지원합니다." });
    return;
  }
  if (!configured) {
    json(res, 503, {
      ok: false,
      error: "서버 메일 설정이 없습니다 (Vercel 환경변수 GMAIL_USER / GMAIL_APP_PASSWORD).",
    });
    return;
  }

  const to = String(req.headers["x-backup-to"] ?? "").trim();
  const encoding = String(req.headers["x-backup-encoding"] ?? "identity");

  if (!EMAIL_RE.test(to) || to.length > 254) {
    json(res, 400, { ok: false, error: "받는 메일 주소가 올바르지 않습니다." });
    return;
  }
  const allowed = (process.env.BACKUP_ALLOWED_TO ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length && !allowed.includes(to.toLowerCase())) {
    json(res, 403, { ok: false, error: "허용되지 않은 받는 주소입니다 (BACKUP_ALLOWED_TO)." });
    return;
  }

  // 본문 읽기 + 압축 해제 + 책갈피 백업 형식인지 확인
  let text: string;
  let books: { title?: string }[] = [];
  let mindMaps = 0;
  let reviews = 0;
  try {
    const raw = await readBody(req);
    const buf = encoding === "gzip" ? gunzipSync(raw, { maxOutputLength: MAX_JSON }) : raw;
    text = buf.toString("utf8");
    const outer = JSON.parse(text);
    const state = outer?.state ?? outer;
    if (!state || !Array.isArray(state.books)) throw new Error("책갈피 백업 형식이 아닙니다.");
    books = state.books;
    mindMaps = Array.isArray(state.mindMaps) ? state.mindMaps.length : 0;
    reviews = Array.isArray(state.reviews) ? state.reviews.length : 0;
  } catch (e) {
    json(res, 400, { ok: false, error: e instanceof Error ? e.message : String(e) });
    return;
  }

  const stamp = seoulStamp();
  const kind = "백업";
  const titles = books
    .map((b) => `  · ${String(b?.title ?? "(제목 없음)").slice(0, 80)}`)
    .slice(0, 60)
    .join("\n");

  const body = [
    `책갈피 ${kind} 파일입니다. (${stamp.label} KST)`,
    "",
    `책 ${books.length}권 · 마인드맵 ${mindMaps}개 · 독후감 ${reviews}개`,
    titles,
    books.length > 60 ? `  … 외 ${books.length - 60}권` : "",
    "",
    "■ 복구하는 방법",
    "1. 첨부된 .json 파일을 휴대폰 '파일' 앱(또는 다운로드 폴더)에 저장합니다.",
    "2. 책갈피 앱 → 서재 상단 '🛟 백업' → '백업 파일에서 복구' → 파일 선택",
    "",
    "이 메일은 책갈피 앱에서 설정한 주소로 발송되었습니다.",
  ]
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
    .join("\n");

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: { name: "책갈피 백업", address: user! },
      to,
      subject: `[책갈피] ${kind} · ${stamp.label} · 책 ${books.length}권`,
      text: body,
      attachments: [
        {
          filename: `chaekgalpi-backup-${stamp.file}.json`,
          content: text,
          contentType: "application/json; charset=utf-8",
        },
      ],
    });
    json(res, 200, { ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hint = /Invalid login|BadCredentials|535/i.test(msg)
      ? "Gmail 로그인 실패 — 앱 비밀번호를 확인해 주세요."
      : `메일 발송 실패: ${msg}`;
    json(res, 502, { ok: false, error: hint });
  }
}
