import type { LayoutDirection } from "./mindmapPresets";

/**
 * 마인드맵 트리 유틸 + 자동 정렬.
 *
 * 연결선은 자유롭게 그을 수 있어서(여러 부모, 순환 가능) 엄밀한 트리가 아니다.
 * 여기서는 "들어오는 선이 없는 노드"를 뿌리로 보고, 뿌리에서 처음 닿은 경로를
 * 그 노드의 부모로 삼아 트리로 해석한다.
 */

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  collapsed?: boolean;
}

export interface LayoutEdge {
  source: string;
  target: string;
}

export interface Tree {
  roots: string[];
  children: Map<string, string[]>;
  parent: Map<string, string>;
}

export function buildTree(
  nodes: Pick<LayoutNode, "id" | "x" | "y">[],
  edges: LayoutEdge[],
  direction: LayoutDirection = "right"
): Tree {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<string, string[]>();
  const hasIncoming = new Set<string>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target) || e.source === e.target) continue;
    out.set(e.source, [...(out.get(e.source) ?? []), e.target]);
    hasIncoming.add(e.target);
  }

  // 형제 순서는 지금 화면에 놓인 순서를 따른다 (정렬해도 사용자가 둔 순서 유지)
  const order = (a: string, b: string) => {
    const na = byId.get(a)!;
    const nb = byId.get(b)!;
    return direction === "down" ? na.x - nb.x || na.y - nb.y : na.y - nb.y || na.x - nb.x;
  };

  const roots = nodes
    .filter((n) => !hasIncoming.has(n.id))
    .map((n) => n.id)
    .sort(order);
  const children = new Map<string, string[]>();
  const parent = new Map<string, string>();
  const seen = new Set<string>(roots);
  const grow = (start: string[]) => {
    const queue = [...start];
    while (queue.length) {
      const id = queue.shift()!;
      const kids: string[] = [];
      for (const k of [...(out.get(id) ?? [])].sort(order)) {
        if (seen.has(k)) continue;
        seen.add(k);
        parent.set(k, id);
        kids.push(k);
        queue.push(k);
      }
      if (kids.length) children.set(id, kids);
    }
  };
  grow(roots);
  // 선이 고리를 이루어 뿌리가 없는 묶음은, 먼저 만든 노드를 뿌리로 삼는다
  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    roots.push(n.id);
    grow([n.id]);
  }
  return { roots, children, parent };
}

/** 특정 노드의 모든 자손 id */
export function descendantsOf(id: string, children: Map<string, string[]>): string[] {
  const result: string[] = [];
  const stack = [...(children.get(id) ?? [])];
  while (stack.length) {
    const next = stack.pop()!;
    result.push(next);
    stack.push(...(children.get(next) ?? []));
  }
  return result;
}

const H_GAP = 56; // 부모-자식 사이 (가로 배치)
const V_GAP = 16; // 형제 사이
const DOWN_LEVEL_GAP = 64; // 부모-자식 사이 (세로 배치)
const DOWN_SIBLING_GAP = 24;
const RADIAL_STEP = 240;

/**
 * 트리를 깔끔하게 다시 배치한다. 뿌리 노드는 제자리에 두고 가지만 정돈한다.
 * 접힌 가지의 숨은 노드는 접힌 노드를 따라 함께 이동한다.
 * 반환값: 위치가 바뀌는 노드의 새 좌표.
 */
export function layoutTree(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  direction: LayoutDirection
): Map<string, { x: number; y: number }> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const tree = buildTree(nodes, edges, direction);
  const result = new Map<string, { x: number; y: number }>();

  const visibleKids = (id: string) => (byId.get(id)?.collapsed ? [] : tree.children.get(id) ?? []);

  // 접힌 노드가 움직인 만큼 숨은 자손도 옮긴다
  const carryHidden = (id: string) => {
    const n = byId.get(id)!;
    if (!n.collapsed) return;
    const moved = result.get(id);
    if (!moved) return;
    const dx = moved.x - n.x;
    const dy = moved.y - n.y;
    for (const d of descendantsOf(id, tree.children)) {
      const dn = byId.get(d)!;
      result.set(d, { x: dn.x + dx, y: dn.y + dy });
    }
  };

  for (const rootId of tree.roots) {
    if (!visibleKids(rootId).length) continue;
    const root = byId.get(rootId)!;
    const placed = new Map<string, { x: number; y: number }>();

    if (direction === "radial") {
      const leaves = new Map<string, number>();
      const countLeaves = (id: string): number => {
        const kids = visibleKids(id);
        const c = kids.length ? kids.reduce((s, k) => s + countLeaves(k), 0) : 1;
        leaves.set(id, c);
        return c;
      };
      countLeaves(rootId);
      const cx = root.x + root.w / 2;
      const cy = root.y + root.h / 2;
      const assign = (id: string, a0: number, a1: number, depth: number) => {
        const n = byId.get(id)!;
        if (depth > 0) {
          const mid = (a0 + a1) / 2;
          placed.set(id, {
            x: cx + Math.cos(mid) * depth * RADIAL_STEP - n.w / 2,
            y: cy + Math.sin(mid) * depth * RADIAL_STEP * 0.72 - n.h / 2,
          });
        }
        let a = a0;
        const total = leaves.get(id)!;
        for (const k of visibleKids(id)) {
          const span = ((a1 - a0) * leaves.get(k)!) / total;
          assign(k, a, a + span, depth + 1);
          a += span;
        }
      };
      assign(rootId, -Math.PI / 2, Math.PI * 1.5, 0);
    } else {
      const horizontal = direction !== "down";
      // 가지가 차지하는 두께(가로 배치면 높이, 세로 배치면 폭)
      const thick = (n: LayoutNode) => (horizontal ? n.h : n.w);
      const gap = horizontal ? V_GAP : DOWN_SIBLING_GAP;
      const band = new Map<string, number>();
      const measure = (id: string): number => {
        const n = byId.get(id)!;
        const kids = visibleKids(id);
        const kidsTotal = kids.reduce((s, k) => s + measure(k), 0) + gap * Math.max(0, kids.length - 1);
        const size = Math.max(thick(n), kidsTotal);
        band.set(id, size);
        return size;
      };
      measure(rootId);

      const place = (id: string, depthPos: number, start: number) => {
        const n = byId.get(id)!;
        const size = band.get(id)!;
        const cross = start + (size - thick(n)) / 2;
        placed.set(id, horizontal ? { x: depthPos, y: cross } : { x: cross, y: depthPos });
        const kids = visibleKids(id);
        if (!kids.length) return;
        const kidsTotal = kids.reduce((s, k) => s + band.get(k)!, 0) + gap * (kids.length - 1);
        let cursor = start + (size - kidsTotal) / 2;
        const nextDepth = horizontal ? depthPos + n.w + H_GAP : depthPos + n.h + DOWN_LEVEL_GAP;
        for (const k of kids) {
          place(k, nextDepth, cursor);
          cursor += band.get(k)! + gap;
        }
      };
      place(rootId, 0, 0);

      // 뿌리가 원래 자리에 남도록 전체를 평행이동
      const rootPlaced = placed.get(rootId)!;
      const dx = root.x - rootPlaced.x;
      const dy = root.y - rootPlaced.y;
      for (const [id, p] of placed) placed.set(id, { x: p.x + dx, y: p.y + dy });
    }

    for (const [id, p] of placed) {
      result.set(id, p);
      carryHidden(id);
    }
  }
  return result;
}

/** 가지별 선 색 — 뿌리의 첫 단계 가지마다 한 색 (붉은 계열 제외) */
export const BRANCH_COLORS = [
  "#3d9a8b",
  "#e0a43a",
  "#5b8def",
  "#9b6bd1",
  "#4caf7d",
  "#2aa7c9",
  "#8a8f3c",
  "#6b7c93",
];

/** 노드 id → 그 노드가 속한 큰 가지의 색 */
export function branchColorMap(tree: Tree): Map<string, string> {
  const colors = new Map<string, string>();
  let i = 0;
  for (const root of tree.roots) {
    for (const main of tree.children.get(root) ?? []) {
      const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
      i += 1;
      colors.set(main, color);
      for (const d of descendantsOf(main, tree.children)) colors.set(d, color);
    }
  }
  return colors;
}
