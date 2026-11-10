import { createContext, useContext } from "react";
import type { MindMapNodeData, MindNodeKind } from "../../types";

export interface MindMapActions {
  updateNodeData: (id: string, patch: Partial<MindMapNodeData>) => void;
  addChild: (parentId: string, kind?: MindNodeKind) => void;
  /** 같은 부모 아래에 형제 노드 추가 */
  addSibling: (id: string) => void;
  /** 가지 접기/펼치기 */
  toggleCollapse: (id: string) => void;
  /** 자식 수와, 접혔을 때 숨겨진 자손 수 */
  foldInfo: (id: string) => { children: number; hidden: number };
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  clearSelection: () => void;
  nodeShapeClass: string;
}

export const MindMapContext = createContext<MindMapActions | null>(null);

export function useMindMapActions(): MindMapActions {
  const ctx = useContext(MindMapContext);
  if (!ctx) throw new Error("MindMapContext provider missing");
  return ctx;
}
