import type { Book, Quote, Review } from "../types";

/**
 * 책 한 권의 기록(정보 · 생각거리 답변 · 독후감 · 구절 · 마인드맵)을 PDF 로 만든다.
 *
 * 한글 폰트를 PDF 에 임베드하면 용량이 커지고 글꼴 문제가 잦아서,
 * 내용을 화면과 같은 DOM 으로 그린 뒤 이미지로 래스터화해 페이지에 넣는다.
 * (브라우저가 렌더하므로 한글·이모지가 그대로 나온다)
 *
 * jspdf / html-to-image 는 필요할 때만 동적으로 불러와 초기 번들을 키우지 않는다.
 */

export interface ExportInput {
  book: Book;
  review?: Review;
  quotes: Quote[];
  prompts: string[];
  answers: string[];
  /** 마인드맵 캡처 이미지(dataURL). 없으면 해당 페이지를 넣지 않는다 */
  mindMapDataUrl?: string;
}

const A4 = { w: 210, h: 297 }; // mm
const MARGIN = 10;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const QUOTE_COLOR: Record<string, string> = {
  yellow: "#f5c518",
  blue: "#3b9ae1",
  pink: "#e86f9e",
  green: "#3fb27f",
  cream: "#c9c2b4",
};

/** 인쇄용 리포트 DOM 을 만들어 화면 밖에 붙인다 */
function buildReportNode(input: ExportInput): HTMLElement {
  const { book, review, quotes, prompts, answers } = input;
  const el = document.createElement("div");
  // 화면에 보이지 않지만 렌더는 되도록 (display:none 이면 캡처 불가)
  el.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    "width:820px",
    "padding:40px",
    "background:#ffffff",
    "color:#2a2620",
    "font-family:'Gowun Dodum',system-ui,-apple-system,'Apple SD Gothic Neo',sans-serif",
    "line-height:1.7",
    "box-sizing:border-box",
  ].join(";");

  const meta = [book.author, book.publisher, book.publishedDate?.slice(0, 10)]
    .filter(Boolean)
    .join(" · ");

  const qaHtml =
    prompts.length > 0
      ? `<section style="margin-top:28px">
           <h2 style="font-size:17px;font-weight:700;margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid #22335a">서평으로 보는 생각거리</h2>
           ${prompts
             .map(
               (q, i) => `
             <div style="margin-bottom:14px;padding:12px 14px;background:#f7f6f2;border-radius:6px">
               <p style="margin:0 0 6px;font-weight:700;font-size:14px">Q${i + 1}. ${esc(q)}</p>
               <p style="margin:0;white-space:pre-wrap;font-size:13px;color:#44403c">${
                 answers[i]?.trim() ? esc(answers[i]) : "<span style='color:#a8a29e'>(답변 없음)</span>"
               }</p>
             </div>`
             )
             .join("")}
         </section>`
      : "";

  const reviewHtml = review?.content?.trim()
    ? `<section style="margin-top:28px">
         <h2 style="font-size:17px;font-weight:700;margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid #22335a">독후감</h2>
         ${
           review.rating
             ? `<p style="margin:0 0 8px;font-size:14px;color:#b45309">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</p>`
             : ""
         }
         <div style="white-space:pre-wrap;font-size:13.5px">${esc(review.content)}</div>
         ${
           review.photoUrl
             ? `<img src="${review.photoUrl}" style="margin-top:12px;max-width:100%;border-radius:6px" />`
             : ""
         }
       </section>`
    : "";

  const quotesHtml =
    quotes.length > 0
      ? `<section style="margin-top:28px">
           <h2 style="font-size:17px;font-weight:700;margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid #22335a">구절 · 하이라이트 (${quotes.length})</h2>
           ${quotes
             .map(
               (q) => `
             <div style="margin-bottom:12px;padding:10px 14px;border-left:4px solid ${
               QUOTE_COLOR[q.color] ?? "#c9c2b4"
             };background:#fafaf8;border-radius:0 6px 6px 0">
               <p style="margin:0;white-space:pre-wrap;font-size:13px">${esc(q.text)}</p>
               <p style="margin:6px 0 0;font-size:11px;color:#78716c">${
                 q.page ? esc(q.page) + " · " : ""
               }${new Date(q.createdAt).toLocaleDateString("ko-KR")}</p>
               ${
                 q.photoUrl
                   ? `<img src="${q.photoUrl}" style="margin-top:8px;max-height:220px;border-radius:4px" />`
                   : ""
               }
             </div>`
             )
             .join("")}
         </section>`
      : "";

  el.innerHTML = `
    <header style="display:flex;gap:20px;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid #22335a">
      ${
        book.coverUrl
          ? `<img src="${book.coverUrl}" style="width:110px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.18)" />`
          : ""
      }
      <div style="flex:1;min-width:0">
        <p style="margin:0;font-size:10px;letter-spacing:.35em;color:#a8a29e">책갈피 · READING JOURNAL</p>
        <h1 style="margin:4px 0 6px;font-size:26px;font-weight:800;line-height:1.25;color:#22335a">${esc(book.title)}</h1>
        <p style="margin:0;font-size:13px;color:#57534e">${esc(meta)}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#78716c">
          상태: ${esc(book.status)}${
            book.pageCount ? ` · ${book.currentPage ?? 0}/${book.pageCount}p` : ""
          }
        </p>
      </div>
    </header>
    ${qaHtml}
    ${reviewHtml}
    ${quotesHtml}
    <footer style="margin-top:32px;padding-top:10px;border-top:1px solid #e7e5e4;font-size:10px;color:#a8a29e;text-align:right">
      ${new Date().toLocaleDateString("ko-KR")} · 책갈피에서 내보냄
    </footer>
  `;
  document.body.appendChild(el);
  return el;
}

/** 이미지 로딩이 끝날 때까지 대기 (표지·첨부 사진이 빠지지 않도록) */
async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          // 외부 이미지가 막히면 무한 대기하지 않도록
          setTimeout(resolve, 4000);
        })
    )
  );
}

/** 긴 이미지를 A4 여러 장으로 나눠 넣는다 */
function addImagePaged(
  pdf: any,
  dataUrl: string,
  imgW: number,
  imgH: number,
  isFirstPage: boolean
) {
  const pageW = A4.w - MARGIN * 2;
  const pageH = A4.h - MARGIN * 2;
  const scale = pageW / imgW; // mm per px
  const fullH = imgH * scale; // 전체 높이(mm)

  let offset = 0;
  let first = isFirstPage;
  while (offset < fullH - 0.5) {
    if (!first) pdf.addPage();
    first = false;
    // 이미지를 위로 밀어 해당 구간만 보이게
    pdf.addImage(dataUrl, "PNG", MARGIN, MARGIN - offset, pageW, fullH, undefined, "FAST");
    // 페이지 경계 아래로 넘어간 부분을 흰색으로 덮어 잘림선을 깔끔하게
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, A4.h - MARGIN, A4.w, MARGIN, "F");
    pdf.rect(0, 0, A4.w, MARGIN, "F");
    offset += pageH;
  }
}

export async function buildBookPdf(input: ExportInput): Promise<Blob> {
  const [{ jsPDF }, htmlToImage] = await Promise.all([
    import("jspdf"),
    import("html-to-image"),
  ]);

  const node = buildReportNode(input);
  try {
    await waitForImages(node);
    // 폰트 적용 대기
    await (document as any).fonts?.ready;

    const dataUrl = await htmlToImage.toPng(node, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });
    const w = node.scrollWidth;
    const h = node.scrollHeight;

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    addImagePaged(pdf, dataUrl, w, h, true);

    // 마인드맵은 가로 방향 한 페이지로
    if (input.mindMapDataUrl) {
      pdf.addPage("a4", "landscape");
      const pw = A4.h - MARGIN * 2; // 가로 방향이므로 폭/높이 교환
      const ph = A4.w - MARGIN * 2;
      const img = new Image();
      img.src = input.mindMapDataUrl;
      await new Promise((r) => {
        img.onload = r;
        img.onerror = r;
      });
      const ratio = Math.min(pw / (img.width || 1), ph / (img.height || 1));
      const dw = (img.width || 1) * ratio;
      const dh = (img.height || 1) * ratio;
      pdf.setFontSize(9);
      pdf.addImage(
        input.mindMapDataUrl,
        "PNG",
        MARGIN + (pw - dw) / 2,
        MARGIN + (ph - dh) / 2,
        dw,
        dh,
        undefined,
        "FAST"
      );
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
  try {
    const htmlToImage = await import("html-to-image");
    return await htmlToImage.toPng(viewport, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
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
      // 사용자가 취소한 경우는 조용히 무시
      if (e?.name === "AbortError") return true;
    }
  }
  downloadBlob(blob, filename);
  return false;
}
