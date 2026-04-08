"use client";

import { useState, useEffect } from "react";
import { Day, DAYS, Department } from "@/lib/types";
import { Field, SubmitBtn } from "@/components/ui/FormFields";
import { departmentApi } from "@/lib/api";

interface LecturerData {
  id?: number;
  first_name: string;
  last_name: string;
  staff_id: string;
  department: number;
  email: string;
  unavailable_days_input?: string[];
  unavailable_days?: { id: number, day: string }[];
}

interface Props {
  initial?: LecturerData;
  onSubmit: (data: LecturerData) => void;
  loading?: boolean;
}

const selectCls = `
  w-full px-3 py-2 text-sm rounded-lg bg-white border border-black/60
  text-black/60 focus:outline-none focus:border-blue-400 focus:ring-4
   focus:ring-blue-400/30 transition-all
`;

export default function LecturerForm({ initial, onSubmit, loading }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  // We manage the UI state as available days for user friendliness
  const currentUnavailable = initial?.unavailable_days?.map(d => d.day) || [];
  const [availableDays, setAvailableDays] = useState<string[]>(
    initial ? DAYS.filter(d => !currentUnavailable.includes(d)) : DAYS
  );

  useEffect(() => {
    departmentApi.getAll().then(setDepartments).catch(console.error);
  }, []);

  const toggle = (day: string) =>
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        // Calculate unavailable days to send directly to backend
        const unavailableDays = DAYS.filter((d) => !availableDays.includes(d));

        onSubmit({
          first_name: fd.get("first_name") as string,
          last_name: fd.get("last_name") as string,
          staff_id: fd.get("staff_id") as string,
          email: fd.get("email") as string,
          department: Number(fd.get("department")),
          unavailable_days_input: unavailableDays,
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="First Name"
          name="first_name"
          defaultValue={initial?.first_name}
          placeholder="e.g. John"
          required
        />
        <Field
          label="Last Name"
          name="last_name"
          defaultValue={initial?.last_name}
          placeholder="e.g. Smith"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Staff ID"
          name="staff_id"
          defaultValue={initial?.staff_id}
          placeholder="e.g. STF-100"
          required
        />
        <Field
          label="Email"
          name="email"
          type="email"
          defaultValue={initial?.email}
          placeholder="e.g. j.smith@uni.edu"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
          Department
        </label>
        <select
          name="department"
          defaultValue={initial?.department ?? ""}
          required
          className={selectCls}
        >
          <option value="">Select department…</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
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
                  availableDays.includes(day)
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-blue-400 border-blue-300 text-white hover:bg-blue-600 hover:border-blue-500"
                }
              `}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <SubmitBtn loading={loading} />
    </form>
  );
}
