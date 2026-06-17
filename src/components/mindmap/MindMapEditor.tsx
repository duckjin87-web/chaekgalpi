import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useLibraryStore } from "../../store/useLibraryStore";
import type { MindMapNodeData } from "../../types";
import { randomBookmarkColor } from "../../theme";
import BookmarkNode from "./BookmarkNode";
import NodeSidePanel from "./NodeSidePanel";

type FlowNode = Node<MindMapNodeData, "bookmark">;

const nodeTypes = { bookmark: BookmarkNode };

interface MindMapEditorProps {
  bookId: string;
}

function makeNode(position: { x: number; y: number }): FlowNode {
  return {
    id: crypto.randomUUID(),
    type: "bookmark",
    position,
    data: { text: "새 노드", color: randomBookmarkColor(), memo: "", attachments: [] },
  };
}

function MindMapCanvas({ bookId }: MindMapEditorProps) {
  const mindMap = useLibraryStore((s) => s.getMindMap(bookId));
  const updateMindMap = useLibraryStore((s) => s.updateMindMap);
  const { screenToFlowPosition } = useReactFlow();

  const initialNodes = useMemo<FlowNode[]>(
    () =>
      (mindMap?.nodes ?? []).map((n) => ({
        id: n.id,
        type: "bookmark" as const,
        position: n.position,
        data: n.data,
      })),
    [mindMap?.id]
  );
  const initialEdges = useMemo<Edge[]>(
    () => (mindMap?.edges ?? []).map((e) => ({ id: e.id, source: e.source, target: e.target })),
    [mindMap?.id]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const skipFirstSave = useRef(true);

  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    updateMindMap(bookId, {
      nodes: nodes.map((n) => ({ id: n.id, position: n.position, data: n.data })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  function addNode(position: { x: number; y: number }) {
    setNodes((nds) => [...nds, makeNode(position)]);
  }

  function handlePaneDoubleClick(event: MouseEvent) {
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addNode(position);
  }

  function updateNodeData(id: string, patch: Partial<MindMapNodeData>) {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
  }

  function deleteNode(id: string) {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  }

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="relative h-[600px] w-full rounded-md border border-stone-300 bg-[#faf7f0]">
      <div className="absolute left-4 top-4 z-10">
        <button
          onClick={() => addNode({ x: Math.random() * 300, y: Math.random() * 200 })}
          className="rounded bg-emerald-800 px-3 py-1.5 text-sm text-white shadow hover:bg-emerald-900"
        >
          + 노드 추가
        </button>
        <p className="mt-1 text-xs text-stone-400">캔버스를 더블클릭해도 추가돼요</p>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(connection: Connection) =>
          setEdges((eds) => addEdge({ ...connection, id: crypto.randomUUID() }, eds))
        }
        onNodeClick={(_, node) => setSelectedId(node.id)}
        onPaneClick={() => setSelectedId(null)}
        onDoubleClick={handlePaneDoubleClick}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      <NodeSidePanel
        node={selectedNode}
        onUpdate={updateNodeData}
        onDelete={deleteNode}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

export default function MindMapEditor(props: MindMapEditorProps) {
  return (
    <ReactFlowProvider>
      <MindMapCanvas {...props} />
    </ReactFlowProvider>
  );
}
