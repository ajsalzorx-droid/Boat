"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

// Small admin notifications: call toast("Item added") anywhere on the admin side.
// <Toaster /> is mounted once in the admin layout and shows them bottom-right.
// Pages without a Toaster (SEO Studio, kitchen) get a plain alert instead, so no message is lost.

type ToastKind = "success" | "error";
type ToastItem = { id: number; message: string; kind: ToastKind };

let nextId = 1;
const listeners = new Set<(t: ToastItem) => void>();

export function toast(message: string, kind: ToastKind = "success") {
  if (listeners.size === 0) {
    if (typeof window !== "undefined") alert(message);
    return;
  }
  const t = { id: nextId++, message, kind };
  listeners.forEach((fn) => fn(t));
}

// Errors stay up longer: they usually say what to fix
const DURATION_MS: Record<ToastKind, number> = { success: 3000, error: 6000 };

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const add = (t: ToastItem) => {
      setToasts((list) => [...list, t]);
      setTimeout(() => setToasts((list) => list.filter((x) => x.id !== t.id)), DURATION_MS[t.kind]);
    };
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, []);

  const dismiss = (id: number) => setToasts((list) => list.filter((x) => x.id !== id));

  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 left-4 md:left-auto z-[60] flex flex-col items-end gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-center gap-3 w-full md:w-auto md:min-w-72 max-w-sm rounded-lg shadow-lg border bg-white px-4 py-3 text-sm animate-[toast-in_0.2s_ease-out] ${
            t.kind === "success" ? "border-green-200" : "border-red-200"
          }`}
        >
          {t.kind === "success" ? (
            <CheckCircle2 size={18} className="text-green-600 shrink-0" />
          ) : (
            <XCircle size={18} className="text-red-500 shrink-0" />
          )}
          <span className="flex-1 text-navy font-medium whitespace-pre-line">{t.message}</span>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      ))}
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
