import { createContext, useContext } from "react";
import type { MindMapNodeData, MindNodeKind } from "../../types";

export interface MindMapActions {
  updateNodeData: (id: string, patch: Partial<MindMapNodeData>) => void;
  addChild: (parentId: string, kind?: MindNodeKind) => void;
  deleteNode: (id: string) => void;
  clearSelection: () => void;
}

export const MindMapContext = createContext<MindMapActions | null>(null);

export function useMindMapActions(): MindMapActions {
  const ctx = useContext(MindMapContext);
  if (!ctx) throw new Error("MindMapContext provider missing");
  return ctx;
}
