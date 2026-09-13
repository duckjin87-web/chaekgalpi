import type { Book, Review } from "../types";

/**
 * 책 한 권의 기록을 가로(landscape) A4 보고서 PDF 로 만든다.
 *
 * 담는 것: 책 정보 · 생각거리 3문답 · 독후감 · 마인드맵
 * 내용이 비어 있는 항목은 제목만 남기고 본문은 넣지 않는다.
 *
 * 한글 폰트 임베드 대신 DOM 을 이미지로 래스터화한다
 * (브라우저 렌더이므로 한글·이모지가 그대로 나온다).
 * 속도를 위해 첨부 사진은 넣지 않고 pixelRatio 를 낮춘다.
 */

export interface ExportInput {
  book: Book;
  review?: Review;
  prompts: string[];
  answers: string[];
  /** 마인드맵 캡처 이미지(dataURL). 없으면 제목만 있는 페이지로 대체 */
  mindMapDataUrl?: string;
}

/** 가로 A4 (mm) */
const PAGE = { w: 297, h: 210 };
const MARGIN = 12;
const CONTENT_W = PAGE.w - MARGIN * 2; // 273
const CONTENT_H = PAGE.h - MARGIN * 2; // 186

/** 리포트 DOM 폭(px). 가로 A4 비율에 맞춰 배치된다 */
const NODE_W = 1090;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const EMPTY = `<p style="margin:0;font-size:12px;color:#b0aaa0;font-style:italic">작성된 내용이 없습니다</p>`;

function sectionTitle(text: string): string {
  return `<h2 style="margin:0 0 8px;font-size:15px;font-weight:800;color:#22335a;
    padding-bottom:5px;border-bottom:2px solid #22335a;letter-spacing:-0.01em">${esc(text)}</h2>`;
}

/** 인쇄용 리포트 DOM (화면 밖에 임시로 붙임) */
function buildReportNode(input: ExportInput): HTMLElement {
  const { book, review, prompts, answers } = input;

  const el = document.createElement("div");
  el.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${NODE_W}px`,
    "padding:34px 40px",
    "background:#ffffff",
    "color:#2a2620",
    "font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',system-ui,sans-serif",
    "line-height:1.6",
    "box-sizing:border-box",
  ].join(";");

  const metaParts = [book.author, book.publisher, book.publishedDate?.slice(0, 10)].filter(Boolean);
  const progress =
    book.bookType === "전자책"
      ? `${book.currentPage ?? 0}%`
      : book.pageCount
        ? `${book.currentPage ?? 0} / ${book.pageCount}p`
        : "—";

  // ── 책 정보 (가로 스펙 테이블)
  const infoRows: [string, string][] = [
    ["저자", book.author || "—"],
    ["출판사", book.publisher || "—"],
    ["출판일", book.publishedDate?.slice(0, 10) || "—"],
    ["책 유형", book.bookType || "종이책"],
    ["상태", book.status],
    ["진행", progress],
  ];

  const header = `
    <header style="display:flex;gap:22px;align-items:flex-start;padding-bottom:14px;
      border-bottom:3px solid #22335a;margin-bottom:18px">
      <div style="flex:1;min-width:0">
        <p style="margin:0;font-size:9px;letter-spacing:.38em;color:#a8a29e">책갈피 · READING JOURNAL</p>
        <h1 style="margin:5px 0 6px;font-size:24px;font-weight:800;line-height:1.25;color:#22335a">${esc(book.title)}</h1>
        <p style="margin:0;font-size:12px;color:#57534e">${esc(metaParts.join("  ·  "))}</p>
      </div>
      <table style="border-collapse:collapse;font-size:11px;flex-shrink:0">
        ${infoRows
          .map(
            ([k, v]) => `<tr>
              <td style="padding:2px 10px 2px 0;color:#a8a29e;white-space:nowrap">${esc(k)}</td>
              <td style="padding:2px 0;color:#44403c;white-space:nowrap;font-weight:600">${esc(v)}</td>
            </tr>`
          )
          .join("")}
      </table>
    </header>`;

  // ── 생각거리: 가로 3열
  const answered = prompts.map((q, i) => ({ q, a: (answers[i] ?? "").trim() }));
  const qaHtml = `
    <section style="margin-bottom:20px">
      ${sectionTitle("서평으로 보는 생각거리")}
      ${
        prompts.length === 0
          ? EMPTY
          : `<div style="display:flex;gap:12px;align-items:stretch">
              ${answered
                .map(
                  ({ q, a }, i) => `
                <div style="flex:1;min-width:0;padding:11px 13px;background:#f8f7f4;
                  border:1px solid #eceae4;border-radius:5px;box-sizing:border-box">
                  <p style="margin:0 0 6px;font-size:11.5px;font-weight:700;color:#22335a;line-height:1.45">
                    Q${i + 1}. ${esc(q)}
                  </p>
                  <p style="margin:0;font-size:11.5px;white-space:pre-wrap;color:#44403c;line-height:1.6">${
                    a ? esc(a) : `<span style="color:#b0aaa0;font-style:italic">작성된 내용이 없습니다</span>`
                  }</p>
                </div>`
                )
                .join("")}
            </div>`
      }
    </section>`;

  // ── 독후감
  const reviewText = review?.content?.trim() ?? "";
  const stars = review?.rating
    ? `<span style="font-size:12px;color:#b45309;margin-left:8px">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</span>`
    : "";
  const reviewHtml = `
    <section>
      <h2 style="margin:0 0 8px;font-size:15px;font-weight:800;color:#22335a;
        padding-bottom:5px;border-bottom:2px solid #22335a;letter-spacing:-0.01em">
        독후감${stars}
      </h2>
      ${
        reviewText
          ? `<div style="white-space:pre-wrap;font-size:12.5px;line-height:1.75;color:#3d382f">${esc(reviewText)}</div>`
          : EMPTY
      }
    </section>`;

  el.innerHTML = `
    ${header}
    ${qaHtml}
    ${reviewHtml}
    <footer style="margin-top:22px;padding-top:8px;border-top:1px solid #e7e5e4;
      font-size:9.5px;color:#a8a29e;display:flex;justify-content:space-between">
      <span>책갈피 · 독서 기록</span>
      <span>${new Date().toLocaleDateString("ko-KR")}</span>
    </footer>`;

  document.body.appendChild(el);
  return el;
}

/** 긴 리포트를 가로 A4 여러 장으로 나눠 배치 */
function addImagePaged(pdf: any, dataUrl: string, imgW: number, imgH: number) {
  const scale = CONTENT_W / imgW; // mm per px
  const fullH = imgH * scale;

  let offset = 0;
  let first = true;
  while (offset < fullH - 0.5) {
    if (!first) pdf.addPage(undefined, "landscape");
    first = false;
    pdf.addImage(dataUrl, "JPEG", MARGIN, MARGIN - offset, CONTENT_W, fullH, undefined, "FAST");
    // 페이지 경계 밖으로 삐져나온 부분 가리기
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, PAGE.w, MARGIN, "F");
    pdf.rect(0, PAGE.h - MARGIN, PAGE.w, MARGIN, "F");
    offset += CONTENT_H;
  }
}

export async function buildBookPdf(input: ExportInput): Promise<Blob> {
  const [{ jsPDF }, htmlToImage] = await Promise.all([
    import("jspdf"),
    import("html-to-image"),
  ]);

  const node = buildReportNode(input);
  try {
    await (document as any).fonts?.ready;

    // skipFonts: 한글 웹폰트(수 MB)를 base64 로 인라인하지 않도록 끈다.
    // 리포트는 기기 내장 폰트로 그리므로 한글은 그대로 나온다. (속도의 핵심)
    // PNG 대신 JPEG 로 인코딩해 캔버스 직렬화 비용도 줄인다.
    const dataUrl = await htmlToImage.toJpeg(node, {
      pixelRatio: 1.5,
      quality: 0.94,
      backgroundColor: "#ffffff",
      skipFonts: true,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    addImagePaged(pdf, dataUrl, node.scrollWidth, node.scrollHeight);

    // ── 마인드맵 페이지 (없으면 제목만)
    pdf.addPage(undefined, "landscape");
    if (input.mindMapDataUrl) {
      const img = new Image();
      img.src = input.mindMapDataUrl;
      await new Promise((r) => {
        img.onload = r;
        img.onerror = r;
      });
      const headH = 12;
      const availW = CONTENT_W;
      const availH = CONTENT_H - headH;
      const ratio = Math.min(availW / (img.width || 1), availH / (img.height || 1));
      const dw = (img.width || 1) * ratio;
      const dh = (img.height || 1) * ratio;
      pdf.setTextColor(34, 51, 90);
      pdf.setFontSize(13);
      pdf.text("Mind Map", MARGIN, MARGIN + 6);
      pdf.setDrawColor(34, 51, 90);
      pdf.setLineWidth(0.6);
      pdf.line(MARGIN, MARGIN + 8.5, PAGE.w - MARGIN, MARGIN + 8.5);
      pdf.addImage(
        input.mindMapDataUrl,
        "JPEG",
        MARGIN + (availW - dw) / 2,
        MARGIN + headH + (availH - dh) / 2,
        dw,
        dh,
        undefined,
        "FAST"
      );
    } else {
      pdf.setTextColor(34, 51, 90);
      pdf.setFontSize(13);
      pdf.text("Mind Map", MARGIN, MARGIN + 6);
      pdf.setDrawColor(34, 51, 90);
      pdf.setLineWidth(0.6);
      pdf.line(MARGIN, MARGIN + 8.5, PAGE.w - MARGIN, MARGIN + 8.5);
    }

    return pdf.output("blob") as Blob;
  } finally {
    node.remove();
  }
}

/** 마인드맵 캔버스를 PNG dataURL 로 캡처. 화면에 없으면 undefined */
export async function captureMindMap(): Promise<string | undefined> {
  const viewport = document.querySelector(".react-flow__viewport") as HTMLElement | null;
  if (!viewport) return undefined;
  // 노드가 하나도 없으면 의미 없는 빈 이미지이므로 건너뛴다
  if (!viewport.querySelector(".react-flow__node")) return undefined;
  try {
    const htmlToImage = await import("html-to-image");
    return await htmlToImage.toJpeg(viewport, {
      pixelRatio: 1.5,
      quality: 0.94,
      backgroundColor: "#ffffff",
      skipFonts: true,
    });
  } catch {
    return undefined;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * 공유 시트로 내보내기 (Gmail, 드라이브, 카카오톡 등).
 * 지원하지 않는 환경이면 다운로드로 대체하고 false 를 돌려준다.
 */
export async function sharePdf(blob: Blob, filename: string, title: string): Promise<boolean> {
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as any;
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title, text: `${title} · 책갈피 독서 기록` });
      return true;
    } catch (e: any) {
      if (e?.name === "AbortError") return true;
    }
  }
  downloadBlob(blob, filename);
  return false;
}
