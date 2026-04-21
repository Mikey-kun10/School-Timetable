"use client";

import { useState, useEffect } from "react";
import { DAYS, College } from "@/lib/types";
import { Field, SubmitBtn } from "@/components/ui/FormFields";
import { collegeApi } from "@/lib/api";

import VisualGrid from "@/components/unavailability/VisualGrid";

interface UnavailabilityBlock {
  day: string;
  start_hour: number;
  end_hour: number;
}

interface LecturerData {
  id?: number;
  first_name: string;
  last_name: string;
  staff_id: string;
  college: number | College;
  email: string;
  unavailable_days_input?: UnavailabilityBlock[];
  unavailable_days?: { id: number, day: string, start_hour: number, end_hour: number }[];
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
  const [colleges, setColleges] = useState<College[]>([]);
  
  const [unavailableBlocks, setUnavailableBlocks] = useState<UnavailabilityBlock[]>(
    initial?.unavailable_days?.map(d => ({
        day: d.day,
        start_hour: d.start_hour,
        end_hour: d.end_hour
    })) || []
  );

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
        
        // Validation: Must have at least one slot available
        // Total slots = 5 days * 10 hours = 50
        // We calculate hours unavailable
        const totalHoursUnavailable = unavailableBlocks.reduce((acc, b) => acc + (b.end_hour - b.start_hour), 0);
        
        if (totalHoursUnavailable >= 50) {
          alert("A lecturer must be available for at least one hour.");
          return;
        }

        onSubmit({
          first_name: fd.get("first_name") as string,
          last_name: fd.get("last_name") as string,
          staff_id: fd.get("staff_id") as string,
          email: fd.get("email") as string,
          college: Number(fd.get("college")),
          unavailable_days_input: unavailableBlocks,
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
          College
        </label>
        <select
          name="college"
          value={selectedCollege}
          onChange={(e) => setSelectedCollege(e.target.value)}
          required
          className={selectCls}
        >
          <option value="">Select college…</option>
          {colleges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
          Unavailability Schedule
        </label>
        <VisualGrid value={unavailableBlocks} onChange={setUnavailableBlocks} />
      </div>

      <SubmitBtn loading={loading} />
    </form>
  );
}
