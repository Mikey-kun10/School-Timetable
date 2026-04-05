"use client";

import { Field, SubmitBtn } from "@/components/ui/FormFields";
import { LEVELS, COLLEGES } from "@/lib/types";
import { useEffect, useState } from "react";

const selectCls = `
  w-full px-3 py-2 text-sm rounded-lg bg-white border border-black/60
  text-black/60 focus:outline-none focus:border-blue-400 focus:ring-4
   focus:ring-blue-400/30 transition-all
`;

interface DepartmentData {
  name: string;
  code: string;
  college: string;
  studentCount: number;
  level: string;
}

interface Props {
  initial?: DepartmentData;
  onSubmit: (data: DepartmentData) => void;
  loading?: boolean;
}

export default function DepartmentForm({ initial, onSubmit, loading }: Props) {
  const [college, setCollege] = useState(initial?.college ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          name: fd.get("name") as string,
          code: (fd.get("code") as string).toUpperCase(),
          college: fd.get("college") as string,
          studentCount: Number(fd.get("studentCount")),
          level: fd.get("level") as string,
        });
      }}
      className="space-y-4"
    >
      {/* Name + Code */}
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Department Name"
          name="name"
          defaultValue={initial?.name}
          placeholder="e.g. Computer Science"
          required
        />
        <Field
          label="Code"
          name="code"
          defaultValue={initial?.code}
          placeholder="e.g. CS"
          required
        />
      </div>

      {/* College */}
      <div>
        <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
          College
        </label>
        <select
          name="college"
          value={college}
          onChange={(e) => setCollege(e.target.value)}
          required
          className={selectCls}
        >
          <option value="">Select college…</option>
          {COLLEGES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Student Count + Level */}
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="No. of Students"
          name="studentCount"
          type="number"
          defaultValue={initial?.studentCount !== undefined ? String(initial.studentCount) : ""}
          placeholder="e.g. 120"
          required
        />
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
            Level
          </label>
          <select
            name="level"
            defaultValue={initial?.level ?? ""}
            required
            className={selectCls}
          >
            <option value="">Select level…</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l} Level</option>
            ))}
          </select>
        </div>
      </div>

      <SubmitBtn loading={loading} />
    </form>
  );
}