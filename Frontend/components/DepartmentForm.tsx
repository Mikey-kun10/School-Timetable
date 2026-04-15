"use client";

import { useState, useEffect } from "react";
import { Field, SubmitBtn } from "@/components/ui/FormFields";
import { collegeApi } from "@/lib/api";
import { College } from "@/lib/types";

interface DepartmentData {
  id?: number;
  name: string;
  code: string;
  college: number | College;
}

interface Props {
  initial?: DepartmentData;
  onSubmit: (data: DepartmentData) => void;
  loading?: boolean;
}

const selectCls = `
  w-full px-3 py-2 text-sm rounded-lg bg-white border border-black/60
  text-black/60 focus:outline-none focus:border-blue-400 focus:ring-4
   focus:ring-blue-400/30 transition-all
`;

export default function DepartmentForm({ initial, onSubmit, loading }: Props) {
  const [colleges, setColleges] = useState<College[]>([]);

  const [selectedCollege, setSelectedCollege] = useState<string>(
    initial?.college && typeof initial.college === "object"
      ? String(initial.college.id)
      : initial?.college ? String(initial.college) : ""
  );

  useEffect(() => {
    collegeApi.getAll().then(setColleges).catch(console.error);
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          name: fd.get("name") as string,
          code: (fd.get("code") as string).toUpperCase(),
          college: Number(fd.get("college")),
        });
      }}
      className="space-y-4"
    >
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

      <div>
        <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
          College
        </label>
        <select
          name="college"
          value={selectedCollege}
          onChange={(e) => setSelectedCollege(e.target.value)}
          required
          className={selectCls}
        >
          <option value="">Select a college…</option>
          {colleges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>

      <SubmitBtn loading={loading} />
    </form>
  );
}