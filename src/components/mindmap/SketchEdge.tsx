import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

/**
 * 손으로 그은 듯한 연결선.
 *
 * 베지어 경로를 잘게 나눈 뒤 각 점을 미세하게 흔들어(jitter) 다시 이어
 * 자로 잰 듯한 매끈함을 없앤다. 흔들림은 엣지 id 로 결정되므로
 * 다시 그려도 모양이 바뀌지 않는다. 같은 경로를 두 번 겹쳐 그려
 * 마커로 덧그은 느낌을 낸다.
 */

function seeded(id: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000 - 0.5; // -0.5 ~ 0.5
  };
}

/** SVG path 를 샘플링해 흔들린 폴리라인으로 바꾼다 */
function roughen(d: string, id: string, amp: number, segments = 26): string {
  if (typeof document === "undefined") return d;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  let len = 0;
  try {
    len = path.getTotalLength();
  } catch {
    return d;
  }
  if (!len || !Number.isFinite(len)) return d;

  const rnd = seeded(id);
  const pts: string[] = [];
  for (let i = 0; i <= segments; i++) {
    const p = path.getPointAtLength((len * i) / segments);
    // 시작·끝은 흔들지 않아 핸들에 정확히 붙게 한다
    const edgeFade = Math.sin((Math.PI * i) / segments);
    const jx = rnd() * amp * edgeFade * 2;
    const jy = rnd() * amp * edgeFade * 2;
    pts.push(`${(p.x + jx).toFixed(2)},${(p.y + jy).toFixed(2)}`);
  }
  return `M${pts[0]} L${pts.slice(1).join(" L")}`;
}

export default function SketchEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const [bezier] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const stroke = (style?.stroke as string) ?? "#3f3a33";
  const width = Number(style?.strokeWidth ?? 2.4);

  // 두 번 덧그어 마커 느낌 (두 번째는 살짝 다른 흔들림·연한 색)
  const main = roughen(bezier, id, 1.6);
  const ghost = roughen(bezier, id + "~", 2.6);

  return (
    <>
      <BaseEdge
        id={`${id}-ghost`}
        path={ghost}
        style={{
          stroke,
          strokeWidth: width * 0.9,
          opacity: 0.28,
          strokeLinecap: "round",
          fill: "none",
        }}
      />
      <BaseEdge
        id={id}
        path={main}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke,
          strokeWidth: width,
          strokeLinecap: "round",
          fill: "none",
        }}
      />
    </>
  );
}
