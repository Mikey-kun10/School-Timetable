"use client";

import { useState, useRef, useEffect } from "react";
import { Lecturer } from "@/lib/types";
import { Search, X } from "lucide-react";

interface Props {
  lecturers: Lecturer[];
  value?: number | null;
  onChange: (id: number | null) => void;
  required?: boolean;
}

export default function LecturerCombobox({ lecturers, value, onChange, required }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = lecturers.find((l) => l.id === value) ?? null;



  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.trim()
    ? lecturers.filter((l) => {
        const q = query.toLowerCase();
        return (
          l.staff_id.toLowerCase().includes(q) ||
          l.first_name.toLowerCase().includes(q) ||
          l.last_name.toLowerCase().includes(q) ||
          `${l.first_name} ${l.last_name}`.toLowerCase().includes(q)
        );
      })
    : lecturers;

  const clear = () => {
    onChange(null);
    setQuery("");
    setOpen(false);
  };

  const inputCls =
    "w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-white border border-black/60 " +
    "text-black/60 placeholder-black/30 focus:outline-none focus:border-blue-400 " +
    "focus:ring-4 focus:ring-blue-400/30 transition-all";

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name="lecturer" value={value ?? ""} />

      {selected && !open ? (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-black/60 text-sm text-black/60">
          <span>
            <span className="font-mono text-blue-500 mr-2">{selected.staff_id}</span>
            {selected.first_name} {selected.last_name}
          </span>
          <button type="button" onClick={clear} className="ml-2 text-black/30 hover:text-rose-500 transition-colors">
            <X size={13} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or staff ID…"
            value={query}
            required={required && !value}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className={inputCls}
          />
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-blue-200 bg-white shadow-xl">
          <button
            type="button"
            onMouseDown={() => { onChange(null); setOpen(false); setQuery(""); }}
            className="w-full text-left px-3 py-2 text-xs text-black/40 hover:bg-blue-50 border-b border-blue-100 transition-colors"
          >
            — No lecturer assigned
          </button>

          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-black/40 text-center">No match found.</p>
          ) : (
            filtered.map((l) => (
              <button
                key={l.id}
                type="button"
                onMouseDown={() => { onChange(l.id!); setOpen(false); setQuery(""); }}
                className={
                  "w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 hover:bg-blue-50 transition-colors " +
                  (value === l.id ? "bg-blue-50" : "")
                }
              >
                <span className="font-mono text-xs text-blue-500 shrink-0 w-20">{l.staff_id}</span>
                <span className="text-black/70 flex-1">{l.first_name} {l.last_name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
