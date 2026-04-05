"use client";

import { useState } from "react";
import { DAYS, COLLEGES } from "@/lib/types";
import { Field, SubmitBtn } from "@/components/ui/FormFields";

interface Props {
  initial?: { name: string; email: string; college: string; availableDays: string[] };
  onSubmit: (data: {
    name: string;
    email: string;
    college: string;
    availableDays: string[];
  }) => void;
  loading?: boolean;
}

const selectCls = `
  w-full px-3 py-2 text-sm rounded-lg bg-white border border-black/60
  text-black/60 focus:outline-none focus:border-blue-400 focus:ring-4
   focus:ring-blue-400/30 transition-all
`;

export default function LecturerForm({ initial, onSubmit, loading }: Props) {
  const [days, setDays] = useState<string[]>(initial?.availableDays ?? []);

  const toggle = (day: string) =>
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          name: fd.get("name") as string,
          email: fd.get("email") as string,
          college: fd.get("college") as string,
          availableDays: days,
        });
      }}
      className="space-y-4"
    >
      <Field
        label="Full Name"
        name="name"
        defaultValue={initial?.name}
        placeholder="e.g. Dr. John Smith"
        required
      />
      <Field
        label="Email"
        name="email"
        type="email"
        defaultValue={initial?.email}
        placeholder="e.g. j.smith@university.edu"
        required
      />

      {/* College */}
      <div>
        <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
          College
        </label>
        <select
          name="college"
          defaultValue={initial?.college ?? ""}
          required
          className={selectCls}
        >
          <option value="">Select college…</option>
          {COLLEGES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
          Available Days
        </label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                ${
                  days.includes(day)
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-blue-400 border-blue-300 text-white hover:bg-blue-600 hover:border-blue-500"
                }
              `}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
        {days.length === 0 && (
          <p className="text-xs text-rose-400 mt-2">
            Select at least one available day.
          </p>
        )}
      </div>

      <SubmitBtn loading={loading} />
    </form>
  );
}
