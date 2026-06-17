import type { BookNode } from "../types";
import { spineColors } from "../theme";

interface EditorProps {
  node: BookNode | null;
  onUpdate: (id: string, patch: Partial<Pick<BookNode, "title" | "author" | "color">>) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}

export default function Editor({ node, onUpdate, onAddChild, onDelete }: EditorProps) {
  if (!node) {
    return (
      <div className="w-72 rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-400">
        책을 선택하면 여기서 편집할 수 있어요.
      </div>
    );
  }

  return (
    <div className="w-72 space-y-3 rounded-md border border-gray-300 p-4">
      <div>
        <label className="block text-xs font-medium text-gray-600">제목</label>
        <input
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          value={node.title}
          onChange={(e) => onUpdate(node.id, { title: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600">작가</label>
        <input
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          value={node.author ?? ""}
          onChange={(e) => onUpdate(node.id, { author: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600">색상</label>
        <div className="mt-1 flex gap-1">
          {spineColors.map((color) => (
            <button
              key={color}
              onClick={() => onUpdate(node.id, { color })}
              className={`h-6 w-6 rounded-full border-2 ${
                node.color === color ? "border-black" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
              aria-label={color}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onAddChild(node.id)}
          className="rounded bg-amber-700 px-3 py-1 text-sm text-white hover:bg-amber-800"
        >
          하위 책 추가
        </button>
        <button
          onClick={() => onDelete(node.id)}
          className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
