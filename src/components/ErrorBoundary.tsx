import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message?: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 콘솔에 남겨 원인 추적
    console.error("책갈피 오류:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="paper-texture flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-4xl">📖</p>
          <p className="font-serif text-lg text-stone-700">문제가 발생했어요</p>
          <p className="max-w-xs text-sm text-stone-500">
            작성하던 내용은 안전하게 저장되어 있어요. 아래 버튼으로 다시 불러오세요.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-emerald-800 px-4 py-2 text-sm text-white hover:bg-emerald-900"
          >
            다시 불러오기
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
