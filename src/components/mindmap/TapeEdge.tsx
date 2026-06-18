import { EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { useMindMapActions } from "./MindMapContext";

export default function TapeEdge({ id, sourceX, sourceY, targetX, targetY }: EdgeProps) {
  const { deleteEdge } = useMindMapActions();
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  const angle = (Math.atan2(targetY - sourceY, targetX - sourceX) * 180) / Math.PI;

  return (
    <EdgeLabelRenderer>
      <div
        className="nodrag nopan absolute cursor-pointer"
        style={{
          transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px) rotate(${angle}deg)`,
          pointerEvents: "all",
        }}
        onClick={(e) => {
          e.stopPropagation();
          deleteEdge(id);
        }}
        title="클릭하여 메모 연결 해제"
      >
        <div
          className="h-5 w-16 rounded-[2px] border border-amber-200/60 bg-amber-100/80 shadow-sm"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 2px, transparent 2px, transparent 6px)",
            opacity: 0.85,
          }}
        />
      </div>
    </EdgeLabelRenderer>
  );
}
