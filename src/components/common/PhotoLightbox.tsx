import { useEffect } from "react";

interface PhotoLightboxProps {
  src: string;
  onClose: () => void;
}

export default function PhotoLightbox({ src, onClose }: PhotoLightboxProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt="사진 원본"
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm text-stone-900 shadow"
      >
        닫기 ✕
      </button>
      <a
        href={src}
        download="chaekgalpi-photo.jpg"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-sm text-stone-900 shadow"
      >
        저장
      </a>
    </div>
  );
}
