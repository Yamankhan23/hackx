import { useContext } from "react";
import { ToastListContext, type ToastVariant } from "../../context/toast-store";

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-emerald-400/30 text-emerald-100",
  error: "border-rose-400/30 text-rose-100",
  info: "border-purple-400/30 text-purple-100",
};

const VARIANT_ICON: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

export function ToastContainer() {
  const context = useContext(ToastListContext);
  if (!context || context.toasts.length === 0) {
    return null;
  }

  const { toasts, dismiss } = context;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-slate-950/95 px-4 py-3 text-sm shadow-[0_20px_60px_rgba(8,15,35,0.45)] backdrop-blur ${VARIANT_STYLES[toast.variant]}`}
        >
          <span className="mt-0.5 text-base leading-none">{VARIANT_ICON[toast.variant]}</span>
          <p className="flex-1 leading-5">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            className="text-white/50 transition hover:text-white"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
