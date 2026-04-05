"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}

export default function Toast({ message, type, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDismiss(); }, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50 flex items-center gap-3
        px-4 py-3 rounded-lg border text-sm font-medium shadow-xl
        transition-all duration-300
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
        ${type === "success"
          ? "bg-emerald-400 border-emerald-300 text-emerald-100"
          : "bg-red-950 border-red-800 text-red-300"
        }
      `}
    >
      {type === "success"
        ? <CheckCircle size={15} />
        : <XCircle size={15} />
      }
      {message}
    </div>
  );
}