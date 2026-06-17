import type { BookNode } from "../types";

interface BookSpineProps {
  node: BookNode;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function BookSpine({ node, selected, onSelect }: BookSpineProps) {
  return (
    <button
      onClick={() => onSelect(node.id)}
      className={`flex h-48 w-10 flex-col items-center justify-between rounded-sm border-2 px-1 py-2 text-xs text-white shadow-md transition-transform hover:-translate-y-1 ${
        selected ? "border-white" : "border-black/20"
      }`}
      style={{ backgroundColor: node.color }}
      title={node.title}
    >
      <span className="rotate-180 [writing-mode:vertical-rl]">{node.title}</span>
    </button>
  );
}
