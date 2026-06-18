export type LayoutDirection = "right" | "down" | "radial";

export interface MindMapPreset {
  id: string;
  label: string;
  description: string;
  direction: LayoutDirection;
  edgeType: "smoothstep" | "step" | "default" | "straight";
  nodeShapeClass: string;
}

export const mindMapPresets: MindMapPreset[] = [
  {
    id: "classic",
    label: "클래식",
    description: "좌→우 · 둥근 사각형",
    direction: "right",
    edgeType: "smoothstep",
    nodeShapeClass: "rounded-md",
  },
  {
    id: "tree",
    label: "트리형",
    description: "위→아래 · 카드형",
    direction: "down",
    edgeType: "step",
    nodeShapeClass: "rounded-lg",
  },
  {
    id: "radial",
    label: "방사형",
    description: "중심에서 사방으로 · 캡슐형",
    direction: "radial",
    edgeType: "default",
    nodeShapeClass: "rounded-full",
  },
  {
    id: "card",
    label: "카드형",
    description: "좌→우 · 큰 그림자 카드",
    direction: "right",
    edgeType: "straight",
    nodeShapeClass: "rounded-2xl shadow-lg",
  },
  {
    id: "organic",
    label: "오가닉",
    description: "좌→우 · 비대칭 라운드",
    direction: "right",
    edgeType: "smoothstep",
    nodeShapeClass: "rounded-tl-2xl rounded-br-2xl rounded-tr-md rounded-bl-md",
  },
];

export const defaultPresetId = "classic";

export function getPreset(id: string | undefined): MindMapPreset {
  return mindMapPresets.find((p) => p.id === id) ?? mindMapPresets[0];
}
