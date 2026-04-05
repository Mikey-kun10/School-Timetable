"use client";

import { useEffect, useState } from "react";
import { LEVELS, COLLEGES } from "@/lib/types";
import { Field, SubmitBtn } from "@/components/ui/FormFields";
import { lecturerStore, departmentStore } from "@/lib/store";
import type { Lecturer, Department } from "@/lib/types";

interface CourseFormData {
  courseCode: string;
  title: string;
  college: string;
  duration: number;
  level: string;
  departments: string[];
  lecturerId: string;
  departmentId?: string;
}

interface Props {
  initial?: CourseFormData;
  onSubmit: (data: CourseFormData) => void;
  loading?: boolean;
}

const selectCls = `
  w-full px-3 py-2 text-sm rounded-lg bg-white border border-black/60
  text-black/60 focus:outline-none focus:border-blue-400 focus:ring-4
   focus:ring-blue-400/30 transition-all
`;

export default function CourseForm({ initial, onSubmit, loading }: Props) {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [courseLevel, setCourseLevel] = useState("all")
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptMode, setDeptMode] = useState<"all" | "specific">(
    !initial || initial.departments.includes("ALL") ? "all" : "specific",
  );
  const [lecturerId, setLecturerId] = useState(initial?.lecturerId ?? "");
  const [college, setCollege] = useState(initial?.college ?? "");
  const [selectedDepts, setSelectedDepts] = useState<string[]>(
    initial?.departments.filter((d) => d !== "ALL") ?? [],
  );

  useEffect(() => {
    setLecturers(lecturerStore.getAll());
    setDepartments(departmentStore.getAll());

    if (initial?.lecturerId) setLecturerId(initial.lecturerId);
  }, [initial?.lecturerId]);

  const toggleDept = (code: string, level: string) =>
    setSelectedDepts((prev) =>
      prev.includes(`${code} — ${level}`) ? prev.filter((d) => d !== `${code} — ${level}`) : [...prev, `${code} — ${level}`],
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          courseCode: (fd.get("courseCode") as string).toUpperCase(),
          title: fd.get("title") as string,
          college: fd.get("college") as string,
          duration: Number(fd.get("duration")),
          level: fd.get("level") as string,
          lecturerId: fd.get("lecturerId") as string,
          departmentId: (fd.get("departmentId") as string) || undefined,
          departments: deptMode === "all" ? ["ALL"] : selectedDepts,
        });
      }}
      className="space-y-4"
    >
      {/* Code + Level row */}
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Course Code"
          name="courseCode"
          defaultValue={initial?.courseCode}
          placeholder="e.g. CS301"
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
            onChange={(e) => {
              e.target.value === "" ? setCourseLevel("all") : setCourseLevel(e.target.value)
            }}
            className={selectCls}
          >
            <option value="">Select…</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l} Level
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Title */}
      <Field
        label="Course Title"
        name="title"
        defaultValue={initial?.title}
        placeholder="e.g. Data Structures & Algorithms"
        required
      />

      {/* Duration + Lecturer row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
            Duration (hours)
          </label>
          <select
            name="duration"
            defaultValue={initial?.duration ?? ""}
            required
            className={selectCls}
          >
            <option value="">Select…</option>
            <option key={1} value={1}>
              1 hour
            </option>
            <option key={2} value={2}>
              2 hours
            </option>
            <option key={3} value={3}>
              3 hours
            </option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
            Lecturer
          </label>
          <select
            name="lecturerId"
            value={lecturerId}
            onChange={(e) => setLecturerId(e.target.value)}
            required
            className={selectCls}
          >
            <option value="">Select…</option>
            {lecturers.map((l) => (
              <option key={l.id} value={String(l.id)}>
                {l.name} — {l.college}
              </option>
            ))}
          </select>
          {lecturers.length === 0 && (
            <p className="text-xs text-amber-400 mt-1">
              No lecturers found. Add one first.
            </p>
          )}
        </div>
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
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
          <option key="General" value="General">
            General
          </option>
        </select>
      </div>

      {/* Department scope */}
      <div>
        <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
          Department Scope
        </label>
        <div className="flex gap-2 mb-3">
          {(["all", "specific"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDeptMode(mode)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                ${deptMode === mode
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-white border-blue-300 text-blue-300 hover:border-blue-500 hover:bg-blue-600 hover:text-white"
                }
              `}
            >
              {mode === "all" ? "All Departments" : "Specific Departments"}
            </button>
          ))}
        </div>

        {deptMode === "specific" && (
          <>
            <div className="flex flex-wrap gap-2">
              {courseLevel === "all" ?
                departments.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDept(d.code, d.level)}
                    className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${selectedDepts.includes(`${d.code} — ${d.level}`)
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-white border-blue-300 text-blue-300 hover:border-blue-500 hover:bg-blue-600 hover:text-white"
                      }
                  `}
                  >
                    {d.code} — {d.level}
                  </button>
                )) :
                departments.filter((d) => d.level === courseLevel).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDept(d.code, d.level)}
                    className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${selectedDepts.includes(`${d.code} — ${d.level}`)
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-white border-blue-300 text-blue-300 hover:border-blue-500 hover:bg-blue-600 hover:text-white"
                      }
                  `}
                  >
                    {d.code} — {d.level}
                  </button>
                ))
              }
            </div>
            {departments.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">
                No departments found. Add one first.
              </p>
            )}
            {deptMode === "specific" && selectedDepts.length === 0 && (departments.some((d) => d.level === courseLevel) || courseLevel === "all") && (
              <p className="text-xs text-rose-400 mt-2">
                Select at least one department.
              </p>
            )}
            {deptMode === "specific" && selectedDepts.length === 0 && !departments.some((d) => d.level === courseLevel) && courseLevel !== "all" && (
              <p className="text-xs text-rose-400 mt-2">
                No department exists in selected level.
              </p>
            )}
          </>
        )}
      </div>

      {/* Home department (optional) */}
      <div>
        <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
          Home Department
          <span className="ml-1 normal-case text-slate-600">(optional)</span>
        </label>
        <select
          name="departmentId"
          defaultValue={initial?.departmentId ?? ""}
          className={selectCls}
        >
          <option value="">None</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — {d.level}
            </option>
          ))}
        </select>
      </div>

      <SubmitBtn loading={loading} />
    </form>
  );
}
