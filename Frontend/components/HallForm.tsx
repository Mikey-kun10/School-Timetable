"use client";

import { useState, useEffect } from "react";
import { Field, SubmitBtn } from "@/components/ui/FormFields";
import { Department, Hall } from "@/lib/types";
import { departmentApi } from "@/lib/api";

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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hallType, setHallType] = useState<"department" | "shared" | "general">(
    initial?.hall_type ?? "department"
  );
  const [selectedDepts, setSelectedDepts] = useState<number[]>(
    initial?.departments ?? []
  );

  useEffect(() => {
    departmentApi.getAll().then(setDepartments).catch(console.error);
  }, []);

  const toggleDept = (id: number) => {
    setSelectedDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          name: fd.get("name") as string,
          capacity: Number(fd.get("capacity")),
          hall_type: hallType,
          departments: hallType === "general" ? [] : selectedDepts,
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
          onChange={(e) => setHallType(e.target.value as any)}
          required
          className={selectCls}
        >
          <option value="department">Department-Specific</option>
          <option value="shared">Shared (Multiple Departments)</option>
          <option value="general">General (All Departments)</option>
        </select>
      </div>

      {hallType !== "general" && (
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
            Assign Departments
          </label>
          <div className="flex flex-wrap gap-2">
            {departments.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDept(d.id!)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${
                    selectedDepts.includes(d.id!)
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-white border-blue-300 text-blue-300 hover:border-blue-500 hover:bg-blue-600 hover:text-white"
                  }
                `}
              >
                {d.code}
              </button>
            ))}
          </div>
          {departments.length === 0 && (
            <p className="text-xs text-amber-400 mt-1">
              No departments found. Add one first.
            </p>
          )}
          {selectedDepts.length === 0 && hallType !== "general" && departments.length > 0 && (
             <p className="text-xs text-rose-400 mt-2">
             Select at least one department.
           </p>
          )}
        </div>
      )}

      <SubmitBtn loading={loading} />
    </form>
  );
}
