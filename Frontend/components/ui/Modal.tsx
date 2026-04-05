"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import "../../app/globals.css";

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ title, open, onClose, children }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-2xl max-h-full overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between px-6 py-2 border-b border-blue-400">
          <h3 className="font-semibold text-black/60 text-sm">{title}</h3>
          <button
            onClick={onClose}
            className="text-blue-500 hover:bg-blue-400/10 transition-colors rounded-[50%] h-9 w-9 flex items-center justify-center leading-none"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}