import { useMemo, useState } from "react";
import type { BookNode } from "./types";
import { seedShelf } from "./data/seed";
import { randomSpineColor } from "./theme";
import Shelf from "./components/Shelf";
import Editor from "./components/Editor";

function findNode(nodes: BookNode[], id: string): BookNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

function updateNode(nodes: BookNode[], id: string, patch: Partial<BookNode>): BookNode[] {
  return nodes.map((node) =>
    node.id === id
      ? { ...node, ...patch }
      : { ...node, children: updateNode(node.children, id, patch) }
  );
}

function addChildNode(nodes: BookNode[], parentId: string, child: BookNode): BookNode[] {
  return nodes.map((node) =>
    node.id === parentId
      ? { ...node, children: [...node.children, child] }
      : { ...node, children: addChildNode(node.children, parentId, child) }
  );
}

function removeNode(nodes: BookNode[], id: string): BookNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeNode(node.children, id) }));
}

export default function App() {
  const [shelf, setShelf] = useState<BookNode[]>(seedShelf);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const selectedNode = useMemo(
    () => (selectedId ? findNode(shelf, selectedId) : null),
    [shelf, selectedId]
  );

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleUpdate(id: string, patch: Partial<Pick<BookNode, "title" | "author" | "color">>) {
    setShelf((prev) => updateNode(prev, id, patch));
  }

  function handleAddChild(parentId: string) {
    const child: BookNode = {
      id: crypto.randomUUID(),
      title: "새 책",
      color: randomSpineColor(),
      children: [],
    };
    setShelf((prev) => addChildNode(prev, parentId, child));
    setExpandedIds((prev) => new Set(prev).add(parentId));
  }

  function handleDelete(id: string) {
    setShelf((prev) => removeNode(prev, id));
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <h1 className="mb-4 text-2xl font-bold text-stone-800">책갈피</h1>
      <div className="flex gap-6">
        <Shelf
          nodes={shelf}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onSelect={setSelectedId}
          onToggleExpand={toggleExpand}
        />
        <Editor
          node={selectedNode}
          onUpdate={handleUpdate}
          onAddChild={handleAddChild}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
