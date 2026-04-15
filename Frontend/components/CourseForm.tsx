"use client";

import { useEffect, useState } from "react";
import { LEVELS, Course, Department, Lecturer } from "@/lib/types";
import { Field, SubmitBtn } from "@/components/ui/FormFields";
import LecturerCombobox from "@/components/ui/LecturerCombobox";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { departmentApi, lecturerApi } from "@/lib/api";

interface Props {
  initial?: Course;
  onSubmit: (data: Course) => void;
  loading?: boolean;
}

const selectCls = `
  w-full px-3 py-2 text-sm rounded-lg bg-white border border-black/60
  text-black/60 focus:outline-none focus:border-blue-400 focus:ring-4
   focus:ring-blue-400/30 transition-all
`;

export default function CourseForm({ initial, onSubmit, loading }: Props) {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courseType, setCourseType] = useState<"departmental" | "shared" | "general">(
    initial?.course_type ?? "departmental"
  );
  const [selectedSharedDepts, setSelectedSharedDepts] = useState<number[]>(
    initial?.shared_departments?.map(d => (d && typeof d === "object") ? d.id! : (d as number)) ?? []
  );
  const [selectedLecturer, setSelectedLecturer] = useState<number | null>(
    initial?.lecturer && typeof initial.lecturer === "object"
      ? initial.lecturer.id!
      : (initial?.lecturer as number) ?? null
  );
  const [selectedDept, setSelectedDept] = useState<number | null>(
    initial?.department && typeof initial.department === "object"
      ? initial.department.id!
      : (initial?.department as number) ?? null
  );

  useEffect(() => {
    Promise.all([
      departmentApi.getAll(),
      lecturerApi.getAll()
    ]).then(([depts, lects]) => {
      setDepartments(depts);
      setLecturers(lects);
    }).catch(console.error);
  }, []);

  const toggleSharedDept = (id: number) =>
    setSelectedSharedDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        
        const code = (fd.get("code") as string).toUpperCase();
        const codeRegex = /^(?=.*[A-Z])(?=.*\d).+$/;
        if (!codeRegex.test(code)) {
          alert("Course code must contain both letters and numbers (e.g., CSC301).");
          return;
        }

        if (!selectedLecturer) {
          alert("Please select a lecturer.");
          return;
        }

        if (courseType !== "general" && !selectedDept) {
          alert("Please select a primary department.");
          return;
        }

        if (courseType === "shared" && selectedSharedDepts.length === 0) {
          alert("Please select at least one shared department.");
          return;
        }

        onSubmit({
          name: fd.get("name") as string,
          code: (fd.get("code") as string).toUpperCase(),
          department: courseType === "general" ? null : selectedDept,
          level: Number(fd.get("level")),
          course_type: courseType,
          shared_departments: courseType === "shared" ? selectedSharedDepts : [],
          units: Number(fd.get("units")),
          hours: Number(fd.get("hours")),
          student_count: Number(fd.get("student_count")),
          lecturer: selectedLecturer!,
          shared_session_id: (fd.get("shared_session_id") as string || "").trim() || null,
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Course Code"
          name="code"
          defaultValue={initial?.code}
          placeholder="e.g. CS301"
          required
        />
        <Field
          label="Shared Session ID (Optional)"
          name="shared_session_id"
          defaultValue={initial?.shared_session_id || ""}
          placeholder="e.g. GROUP_A"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Course Title"
          name="name"
          defaultValue={initial?.name}
          placeholder="e.g. Data Structures & Algorithms"
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
            <option value="">Select…</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l} Level
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
          Lecturer
        </label>
        <LecturerCombobox
          lecturers={lecturers}
          value={selectedLecturer}
          onChange={setSelectedLecturer}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field
          label="Units"
          name="units"
          type="number"
          defaultValue={initial?.units ? String(initial.units) : "2"}
          required
        />
        <Field
          label="Weekly Hours"
          name="hours"
          type="number"
          defaultValue={initial?.hours ? String(initial.hours) : "2"}
          required
        />
        <Field
          label="Student Count"
          name="student_count"
          type="number"
          defaultValue={initial?.student_count ? String(initial.student_count) : ""}
          placeholder="e.g. 150"
          required
        />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
            Course Type
          </label>
          <select
            name="course_type"
            value={courseType}
            onChange={(e) => setCourseType(e.target.value as "departmental" | "shared" | "general")}
            required
            className={selectCls}
          >
            <option value="departmental">Departmental (Single Department)</option>
            <option value="shared">Shared (Specific Departments)</option>
            <option value="general">General (All Departments)</option>
          </select>
        </div>

        {courseType !== "general" && (
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
              {courseType === "departmental" ? "Department" : "Primary Department"}
            </label>
            <SearchableSelect
              items={departments}
              value={selectedDept}
              onChange={setSelectedDept}
              required
              placeholder="Search department by name or code…"
            />
          </div>
        )}
      </div>

      {courseType === "shared" && (
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
            Shared With Departments
          </label>
          <div className="flex flex-wrap gap-2">
            {departments.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleSharedDept(d.id!)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${
                    selectedSharedDepts.includes(d.id!)
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-white border-blue-300 text-blue-300 hover:border-blue-500 hover:bg-blue-600 hover:text-white"
                  }
                `}
              >
                {d.code}
              </button>
            ))}
          </div>
          {selectedSharedDepts.length === 0 && (
            <p className="text-xs text-rose-400 mt-2">
              Select at least one other department.
            </p>
          )}
        </div>
      )}

      <SubmitBtn loading={loading} />
    </form>
  );
}
