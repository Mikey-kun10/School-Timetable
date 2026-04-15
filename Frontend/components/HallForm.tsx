"use client";

import { useState, useEffect } from "react";
import { Field, SubmitBtn } from "@/components/ui/FormFields";
import { College, Hall } from "@/lib/types";
import { collegeApi } from "@/lib/api";

interface Props {
  initial?: Hall;
  onSubmit: (data: Hall) => void;
  loading?: boolean;
}

const selectCls = `
  w-full px-3 py-2 text-sm rounded-lg bg-white border border-black/60
  text-black/60 focus:outline-none focus:border-blue-400 focus:ring-4
   focus:ring-blue-400/30 transition-all
`;

export default function HallForm({ initial, onSubmit, loading }: Props) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [hallType, setHallType] = useState<"college" | "shared" | "general">(
    initial?.hall_type ?? "college"
  );
  const [selectedColleges, setSelectedColleges] = useState<number[]>(
    initial?.colleges?.map(c => (c && typeof c === 'object') ? c.id! : (c as number)) ?? []
  );

  useEffect(() => {
    collegeApi.getAll().then(setColleges).catch(console.error);
  }, []);

  const toggleCollege = (id: number) => {
    if (hallType === "college") {
      // College-Specific: radio-style — only one college allowed
      setSelectedColleges((prev) => (prev.includes(id) ? [] : [id]));
    } else {
      // Shared: multi-select
      setSelectedColleges((prev) =>
        prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
      );
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (hallType !== "general" && selectedColleges.length === 0) {
          alert("Please select at least one college for this hall.");
          return;
        }

        onSubmit({
          name: fd.get("name") as string,
          capacity: Number(fd.get("capacity")),
          hall_type: hallType,
          colleges: hallType === "general" ? [] : selectedColleges,
        });
      }}
      className="space-y-4"
    >
      <Field
        label="Hall Name"
        name="name"
        defaultValue={initial?.name}
        placeholder="e.g. Lecture Theater A"
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

      <div>
        <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
          Hall Type
        </label>
        <select
          name="hall_type"
          value={hallType}
          onChange={(e) => {
            setHallType(e.target.value as "college" | "shared" | "general");
            setSelectedColleges([]); // clear selection when type switches
          }}
          required
          className={selectCls}
        >
          <option value="college">College-Specific</option>
          <option value="shared">Shared (Multiple Colleges)</option>
          <option value="general">General (All Colleges)</option>
        </select>
      </div>

      {hallType !== "general" && (
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
            Assign Colleges
          </label>
          <div className="flex flex-wrap gap-2">
            {colleges.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCollege(c.id!)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${
                    selectedColleges.includes(c.id!)
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-white border-blue-300 text-blue-300 hover:border-blue-500 hover:bg-blue-600 hover:text-white"
                  }
                `}
              >
                {c.code}
              </button>
            ))}
          </div>
          {colleges.length === 0 && (
            <p className="text-xs text-amber-400 mt-1">
              No colleges found. Add one first.
            </p>
          )}
          {selectedColleges.length === 0 && colleges.length > 0 && (
             <p className="text-xs text-rose-400 mt-2">
             Select at least one college.
           </p>
          )}
        </div>
      )}

      <SubmitBtn loading={loading} />
    </form>
  );
}
