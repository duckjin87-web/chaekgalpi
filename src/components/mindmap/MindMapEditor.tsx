import { useEffect, useMemo, useRef, type MouseEvent } from "react";
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
import type { MindMapNodeData, MindNodeKind } from "../../types";
import BookmarkNode from "./BookmarkNode";
import MemoNode from "./MemoNode";
import { MindMapContext, type MindMapActions } from "./MindMapContext";
import { getPreset, mindMapPresets, type LayoutDirection } from "../../lib/mindmapPresets";

type FlowNode = Node<MindMapNodeData, MindNodeKind>;
type Snapshot = { nodes: FlowNode[]; edges: Edge[] };

const nodeTypes = { bookmark: BookmarkNode, memo: MemoNode };
const HISTORY_LIMIT = 50;

interface MindMapEditorProps {
  bookId: string;
}

function makeNode(
  kind: MindNodeKind,
  position: { x: number; y: number },
  bookmarkColor: string,
  memoColor: string
): FlowNode {
  if (kind === "memo") {
    return {
      id: crypto.randomUUID(),
      type: "memo",
      position,
      width: 200,
      height: 140,
      data: { text: "", color: memoColor, memo: "", attachments: [], fontSize: 14 },
    };
  }
  return {
    id: crypto.randomUUID(),
    type: "bookmark",
    position,
    data: { text: "새 노드", color: bookmarkColor, memo: "", attachments: [], level: "medium" },
  };
}

function randomFrom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getChildPosition(
  direction: LayoutDirection,
  parent: FlowNode,
  childCount: number,
  parentWidth: number,
  parentHeight: number
): { x: number; y: number } {
  if (direction === "down") {
    return {
      x: parent.position.x + childCount * 220,
      y: parent.position.y + parentHeight + 100,
    };
  }
  if (direction === "radial") {
    const angle = childCount * ((2 * Math.PI) / 6);
    const radius = 220;
    return {
      x: parent.position.x + radius * Math.cos(angle),
      y: parent.position.y + radius * Math.sin(angle),
    };
  }
  return {
    x: parent.position.x + parentWidth + 90,
    y: parent.position.y + childCount * 100,
  };
}

function MindMapCanvas({ bookId }: MindMapEditorProps) {
  const mindMap = useLibraryStore((s) => s.getMindMap(bookId));
  const updateMindMap = useLibraryStore((s) => s.updateMindMap);
  const bookmarkPalette = useLibraryStore((s) => s.bookmarkPalette);
  const memoPalette = useLibraryStore((s) => s.memoPalette);
  const { screenToFlowPosition } = useReactFlow();
  const preset = getPreset(mindMap?.layoutPreset);

  const initialNodes = useMemo<FlowNode[]>(
    () =>
      (mindMap?.nodes ?? []).map((n) => ({
        id: n.id,
        type: (n.type ?? "bookmark") as MindNodeKind,
        position: n.position,
        ...(n.width ? { width: n.width } : {}),
        ...(n.height ? { height: n.height } : {}),
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
  const skipFirstSave = useRef(true);

  const historyRef = useRef<Snapshot[]>([]);
  const dragSnapshotRef = useRef<Snapshot | null>(null);
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
    setNodes(previous.nodes);
    setEdges(previous.edges);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const selected = nodes.filter((n) => n.selected);
        if (selected.length === 0) return;
        e.preventDefault();
        pushHistory(snapshotNow());
        const selectedIds = new Set(selected.map((n) => n.id));
        setNodes((nds) => nds.filter((n) => !selectedIds.has(n.id)));
        setEdges((eds) => eds.filter((ed) => !selectedIds.has(ed.source) && !selectedIds.has(ed.target)));
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
    updateMindMap(bookId, {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: (n.type ?? "bookmark") as MindNodeKind,
        position: n.position,
        width: n.width ?? n.measured?.width,
        height: n.height ?? n.measured?.height,
        data: n.data,
      })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  function onNodesChange(changes: NodeChange<FlowNode>[]) {
    const isDragStart = changes.some(
      (c) => c.type === "position" && c.dragging === true && !dragSnapshotRef.current
    );
    if (isDragStart) dragSnapshotRef.current = snapshotNow();
    const isDragEnd = changes.some((c) => c.type === "position" && c.dragging === false);
    if (isDragEnd && dragSnapshotRef.current) {
      pushHistory(dragSnapshotRef.current);
      dragSnapshotRef.current = null;
    }
    if (changes.some((c) => c.type === "remove")) pushHistory(snapshotNow());
    onNodesChangeBase(changes);
  }

  function selectNode(id: string) {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === id })));
  }

  function clearSelection() {
    setNodes((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)));
  }

  // 선택된 프리셋의 배치 방향대로 부모와 연결된 자식 노드 생성
  function addChild(parentId: string, kind: MindNodeKind = "bookmark") {
    const parent = nodes.find((n) => n.id === parentId);
    if (!parent) return;
    pushHistory(snapshotNow());
    const childCount = edges.filter((e) => e.source === parentId).length;
    const parentWidth = parent.measured?.width ?? parent.width ?? 160;
    const parentHeight = parent.measured?.height ?? parent.height ?? 60;
    const pos = getChildPosition(preset.direction, parent, childCount, parentWidth, parentHeight);
    const child = makeNode(kind, pos, randomFrom(bookmarkPalette), randomFrom(memoPalette));
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), { ...child, selected: true }]);
    setEdges((eds) => addEdge({ id: crypto.randomUUID(), source: parentId, target: child.id }, eds));
  }

  function addStandalone(kind: MindNodeKind, position: { x: number; y: number }) {
    pushHistory(snapshotNow());
    const node = makeNode(kind, position, randomFrom(bookmarkPalette), randomFrom(memoPalette));
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), { ...node, selected: true }]);
  }

  // 상단 버튼: 선택된 노드가 있으면 연결 생성, 없으면 단독 생성
  function handleAddClick(kind: MindNodeKind) {
    const selected = nodes.find((n) => n.selected);
    if (selected) addChild(selected.id, kind);
    else addStandalone(kind, { x: 120 + Math.random() * 120, y: 100 + Math.random() * 120 });
  }

  function handlePaneDoubleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isPane =
      target.classList.contains("react-flow__pane") ||
      target.classList.contains("react-flow__background");
    if (!isPane) return;
    addStandalone("bookmark", screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }

  function updateNodeData(id: string, patch: Partial<MindMapNodeData>) {
    if (!pendingEditSnapshotRef.current) pendingEditSnapshotRef.current = snapshotNow();
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
  }

  // 기능 2: 연결선 클릭 시 삭제
  function handleEdgeClick(_: MouseEvent, edge: Edge) {
    pushHistory(snapshotNow());
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  }

  const actions: MindMapActions = {
    updateNodeData,
    addChild,
    deleteNode,
    clearSelection,
    nodeShapeClass: preset.nodeShapeClass,
  };

  return (
    <MindMapContext.Provider value={actions}>
      <div className="relative h-full w-full rounded-md border border-stone-300 bg-[#faf7f0]">
        <div className="absolute left-4 top-4 z-10 flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAddClick("bookmark")}
              className="rounded bg-emerald-800 px-3 py-1.5 text-sm text-white shadow hover:bg-emerald-900"
            >
              + 노드 추가
            </button>
            <button
              onClick={() => handleAddClick("memo")}
              className="rounded bg-amber-500 px-3 py-1.5 text-sm text-stone-900 shadow hover:bg-amber-400"
            >
              + 메모
            </button>
            <select
              value={preset.id}
              onChange={(e) => updateMindMap(bookId, { layoutPreset: e.target.value })}
              className="rounded border border-stone-300 bg-white/90 px-2 py-1.5 text-sm text-stone-700 shadow"
              title="마인드맵 배치/모양 프리셋"
            >
              {mindMapPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} · {p.description}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-stone-400">
            노드 더블클릭/꾹 누르면 이름 수정 · 노드의 + 또는 오른쪽 점을 끌어 연결 · 선 클릭=삭제 · Delete=노드 삭제 · Ctrl+Z
          </p>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{ type: preset.edgeType, style: { strokeWidth: 2.5, stroke: "#57534e" } }}
          onNodesChange={onNodesChange}
          onEdgesChange={(changes) => {
            pushHistory(snapshotNow());
            onEdgesChange(changes);
          }}
          onConnect={(connection: Connection) => {
            pushHistory(snapshotNow());
            setEdges((eds) => addEdge({ ...connection, id: crypto.randomUUID() }, eds));
          }}
          onNodeClick={(_, node) => selectNode(node.id)}
          onEdgeClick={handleEdgeClick}
          onDoubleClick={handlePaneDoubleClick}
          zoomOnDoubleClick={false}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </MindMapContext.Provider>
  );
}

export default function MindMapEditor(props: MindMapEditorProps) {
  return (
    <ReactFlowProvider>
      <MindMapCanvas {...props} />
    </ReactFlowProvider>
  );
}
