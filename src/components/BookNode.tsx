import type { BookNode as BookNodeType } from "../types";
import BookSpine from "./BookSpine";
import Shelf from "./Shelf";

interface BookNodeProps {
  node: BookNodeType;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

export default function BookNode({ node, selectedId, expandedIds, onSelect, onToggleExpand }: BookNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1">
        <BookSpine node={node} selected={selectedId === node.id} onSelect={onSelect} />
        {hasChildren && (
          <button
            onClick={() => onToggleExpand(node.id)}
            className="self-start text-xs text-amber-800"
            aria-label={isExpanded ? "접기" : "펼치기"}
          >
            {isExpanded ? "▲" : "▼"}
          </button>
        )}
      </div>
      {hasChildren && isExpanded && (
        <Shelf
          nodes={node.children}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
        />
      )}
    </div>
  );
}
