import type { BookNode as BookNodeType } from "../types";
import BookNode from "./BookNode";

interface ShelfProps {
  nodes: BookNodeType[];
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

export default function Shelf({ nodes, selectedId, expandedIds, onSelect, onToggleExpand }: ShelfProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border-b-8 border-amber-900 bg-amber-100/40 p-4">
      {nodes.map((node) => (
        <BookNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </div>
  );
}
