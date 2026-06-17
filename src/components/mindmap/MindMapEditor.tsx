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
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useLibraryStore } from "../../store/useLibraryStore";
import type { MindMapNodeData } from "../../types";
import { randomBookmarkColor } from "../../theme";
import BookmarkNode from "./BookmarkNode";
import NodeSidePanel from "./NodeSidePanel";

type FlowNode = Node<MindMapNodeData, "bookmark">;
type Snapshot = { nodes: FlowNode[]; edges: Edge[] };

const nodeTypes = { bookmark: BookmarkNode };
const HISTORY_LIMIT = 50;

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

  const [nodes, setNodes, onNodesChangeBase] = useNodesState<FlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const skipFirstSave = useRef(true);

  const historyRef = useRef<Snapshot[]>([]);
  const dragSnapshotRef = useRef<Snapshot | null>(null);
  const restoringRef = useRef(false);
  const pendingEditSnapshotRef = useRef<Snapshot | null>(null);
  const pendingEditTimerRef = useRef<number | null>(null);

  function pushHistory(snapshot: Snapshot) {
    historyRef.current.push(snapshot);
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
  }

  function snapshotNow(): Snapshot {
    return { nodes, edges };
  }

  function undo() {
    const previous = historyRef.current.pop();
    if (!previous) return;
    restoringRef.current = true;
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setSelectedId(null);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    if (restoringRef.current) {
      restoringRef.current = false;
    }
    updateMindMap(bookId, {
      nodes: nodes.map((n) => ({ id: n.id, position: n.position, data: n.data })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  function onNodesChange(changes: NodeChange<FlowNode>[]) {
    const isDragStart = changes.some(
      (c) => c.type === "position" && c.dragging === true && !dragSnapshotRef.current
    );
    if (isDragStart) {
      dragSnapshotRef.current = snapshotNow();
    }
    const isDragEnd = changes.some((c) => c.type === "position" && c.dragging === false);
    if (isDragEnd && dragSnapshotRef.current) {
      pushHistory(dragSnapshotRef.current);
      dragSnapshotRef.current = null;
    }
    const isRemove = changes.some((c) => c.type === "remove");
    if (isRemove) {
      pushHistory(snapshotNow());
    }
    onNodesChangeBase(changes);
  }

  function addNode(position: { x: number; y: number }) {
    pushHistory(snapshotNow());
    setNodes((nds) => [...nds, makeNode(position)]);
  }

  function handlePaneDoubleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isPane = target.classList.contains("react-flow__pane") || target.classList.contains("react-flow__background");
    if (!isPane) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addNode(position);
  }

  function updateNodeData(id: string, patch: Partial<MindMapNodeData>) {
    if (!pendingEditSnapshotRef.current) {
      pendingEditSnapshotRef.current = snapshotNow();
    }
    if (pendingEditTimerRef.current) window.clearTimeout(pendingEditTimerRef.current);
    pendingEditTimerRef.current = window.setTimeout(() => {
      if (pendingEditSnapshotRef.current) {
        pushHistory(pendingEditSnapshotRef.current);
        pendingEditSnapshotRef.current = null;
      }
    }, 600);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
  }

  function deleteNode(id: string) {
    pushHistory(snapshotNow());
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  }

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="relative h-[600px] w-full rounded-md border border-stone-300 bg-[#faf7f0]">
      <div className="absolute left-4 top-4 z-10">
        <button
          onClick={() => {
            pushHistory(snapshotNow());
            addNode({ x: Math.random() * 300, y: Math.random() * 200 });
          }}
          className="rounded bg-emerald-800 px-3 py-1.5 text-sm text-white shadow hover:bg-emerald-900"
        >
          + 노드 추가
        </button>
        <p className="mt-1 text-xs text-stone-400">
          캔버스를 더블클릭해도 추가돼요 · Ctrl+Z로 되돌리기
        </p>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={(changes) => {
          pushHistory(snapshotNow());
          onEdgesChange(changes);
        }}
        onConnect={(connection: Connection) => {
          pushHistory(snapshotNow());
          setEdges((eds) => addEdge({ ...connection, id: crypto.randomUUID() }, eds));
        }}
        onNodeClick={(_, node) => setSelectedId(node.id)}
        onPaneClick={() => setSelectedId(null)}
        onDoubleClick={handlePaneDoubleClick}
        zoomOnDoubleClick={false}
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
