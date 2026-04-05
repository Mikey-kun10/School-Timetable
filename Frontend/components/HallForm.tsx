"use client";

import { Field, SubmitBtn } from "@/components/ui/FormFields";
import { COLLEGES } from "@/lib/types";

interface Props {
  initial?: {  code: string; name: string; capacity: number; college: string };
  onSubmit: (data: {  code: string; name: string; capacity: number; college: string }) => void;
  loading?: boolean;
}

const selectCls = `
  w-full px-3 py-2 text-sm rounded-lg bg-white border border-black/60
  text-black/60 focus:outline-none focus:border-blue-400 focus:ring-4
   focus:ring-blue-400/30 transition-all
`;

export default function HallForm({ initial, onSubmit, loading }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          name: fd.get("name") as string,
          code: fd.get("code") as string,
          capacity: Number(fd.get("capacity")),
          college: fd.get("college") as string,
        });
      }}
      className="space-y-4"
    >
      <Field
        label="Hall Name"
        name="name"
        defaultValue={initial?.name}
        required
      />
      <Field
        label="Hall Code"
        name="code"
        defaultValue={initial?.code}
        required
      />
      <Field
        label="Capacity"
        name="capacity"
        type="number"
        defaultValue={
          initial?.capacity !== undefined ? String(initial.capacity) : ""
        }
        placeholder="e.g. 200"
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
          <option key="General" value="General">
            General
          </option>
        </select>
      </div>

      <SubmitBtn loading={loading} />
    </form>
  );
}
