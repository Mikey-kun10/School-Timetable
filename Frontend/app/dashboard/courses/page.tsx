"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import CourseForm from "@/components/CourseForm";
import CSVUploadModal from "@/components/ui/CSVUploadModal";
import { courseApi, lecturerApi, departmentApi, ApiError } from "@/lib/api";
import { Course, Department, Lecturer } from "@/lib/types";


interface CourseExtended extends Course {
  lecturerName: string;
  deptCode: string;
}

export default function CoursesPage() {
  const [data, setData] = useState<CourseExtended[]>([]);
  const [loading, setLoading] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [modal, setModal] = useState<{
    open: boolean;
    row?: Course;
  }>({ open: false });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const load = useCallback(() => {
    Promise.all([
      courseApi.getAll(),
      lecturerApi.getAll(),
      departmentApi.getAll()
    ]).then(([courses, lecturers, depts]) => {
      setDepartments(depts);
      setLecturers(lecturers);
      const joined = courses.map(c => ({
        ...c,
        lecturerName: lecturers.find(l => l.id === c.lecturer)?.first_name
          ? `${lecturers.find(l => l.id === c.lecturer)?.first_name} ${lecturers.find(l => l.id === c.lecturer)?.last_name}`
          : "—",
        deptCode: depts.find(d => d.id === c.department)?.code ?? "—",
        shared_session_id: c.shared_session_id || "—"
      }));
      setData(joined);
    }).catch((err) => {
      if (!(err instanceof ApiError) || err.status >= 500) {
        console.error(err);
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = (body: Course) => {
    setLoading(true);
    const apiCall = modal.row?.id
      ? courseApi.update(modal.row.id, body)
      : courseApi.add(body);

    apiCall
      .then(() => {
        setToast({
          message: `Course ${modal.row ? "updated" : "added"}.`,
          type: "success",
        });
        setModal({ open: false });
        load();
      })
      .catch((err) => {
        if (!(err instanceof ApiError) || err.status >= 500) {
          console.error(err);
        }
        setToast({ message: err.message || "An error occurred.", type: "error" });
      })
      .finally(() => setLoading(false));
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this course?")) return;
    courseApi
      .remove(id)
      .then(() => {
        setToast({ message: "Course deleted.", type: "success" });
        load();
      })
      .catch((err) => {
        if (!(err instanceof ApiError) || err.status >= 500) {
          console.error(err);
        }
        setToast({ message: err.message || "An error occurred.", type: "error" });
      });
  };

  return (
    <>
      <DataTable
        title="Courses"
        data={data}
        columns={[
          {
            key: "code",
            label: "Code",
            filterable: true,
            render: (r) => (
              <span className="font-mono text-blue-400">{r.code}</span>
            ),
          },
          { key: "name", label: "Title", filterable: true },
          {
            key: "deptCode",
            label: "Dept",
            filterable: true,
          },
          {
            key: "level",
            label: "Level",
            render: (r) => `${r.level} Level`,
          },
          {
            key: "shared_session_id",
            label: "Group ID",
            filterable: true,
          },
          {
            key: "hours",
            label: "Hours",
            render: (r) => `${r.hours}h`,
          },
          {
            key: "lecturerName",
            label: "Lecturer",
            filterable: true,
          },
        ]}
        onAdd={() => setModal({ open: true })}
        onEdit={(row) => setModal({ open: true, row })}
        onDelete={(id) => handleDelete(Number(id))}
        onImport={() => setCsvOpen(true)}
      />

      <Modal
        title={modal.row ? "Edit Course" : "Add Course"}
        open={modal.open}
        onClose={() => setModal({ open: false })}
      >
        <CourseForm
          initial={modal.row}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </Modal>

      <CSVUploadModal
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onDone={() => { setCsvOpen(false); load(); }}
        entityName="Course"
        uniqueKey="code"
        existingData={data}
        columns={[
          {
            csvHeader: "code",
            key: "code",
            label: "Code",
            required: true,
            transform: (v) => v.toUpperCase(),
          },
          {
            csvHeader: "name",
            key: "name",
            label: "Title",
            required: true,
          },
          {
            csvHeader: "level",
            key: "level",
            label: "Level",
            required: true,
            transform: (v) => Number(v),
          },
          {
            csvHeader: "units",
            key: "units",
            label: "Units",
            required: true,
            transform: (v) => Number(v),
          },
          {
            csvHeader: "hours",
            key: "hours",
            label: "Hours",
            required: true,
            transform: (v) => Number(v),
          },
          {
            csvHeader: "student_count",
            key: "student_count",
            label: "Students",
            required: true,
            transform: (v) => Number(v),
          },
          {
            csvHeader: "course_type",
            key: "course_type",
            label: "Course Type",
            required: true,
            transform: (v) => v.toLowerCase().trim(),
          },
          {
            csvHeader: "lecturer_staff_id",
            key: "lecturer",
            label: "Lecturer Staff ID",
            required: true,
          },
          {
            csvHeader: "department_code",
            key: "department",
            label: "Department Code",
          },
          {
            csvHeader: "shared_department_codes",
            key: "shared_departments",
            label: "Shared Dept Codes",
            transform: (v) =>
              v ? v.split(";").map((c) => c.trim().toUpperCase()).filter(Boolean) : [],
          },
          {
            csvHeader: "group_id",
            key: "shared_session_id",
            label: "Group ID",
          },
        ]}
        // Custom row-level validator for conditional required fields
        validateRow={(row) => {
          const normalize = (v: any) => String(v).trim().toUpperCase();
          const type = String(row.course_type ?? "").toLowerCase();
          const deptCode = String(row.department ?? "").trim();
          const deptCodeNorm = normalize(row.department ?? "");

          const sharedCodes = (row.shared_departments as unknown as string[]) ?? [];

          if (!["departmental", "shared", "general"].includes(type)) {
            return `Invalid course_type "${row.course_type}". Must be departmental, shared, or general.`;
          }
          if (type === "departmental" && !deptCode) {
            return `course_type is "departmental" but department_code is missing.`;
          }
          if (type === "shared" && !deptCode) {
            return `course_type is "shared" but primary department_code is missing.`;
          }
          if (type === "shared" && sharedCodes.length === 0) {
            return `course_type is "shared" but shared_department_codes is empty. Use semicolons to separate codes e.g. EE;MTH`;
          }
          
          if (type === "shared") {
            const overlap = sharedCodes.find(
              (code) => normalize(code) === deptCodeNorm
            );

            if (overlap) {
              return `Primary department "${deptCodeNorm}" should not be included in shared_department_codes`;
            }
          }

          const level = Number(row.level);
          if (![100, 200, 300, 400, 500].includes(level)) {
            return `Invalid level "${row.level}". Must be 100, 200, 300, 400, or 500.`;
          }
          if (Number(row.units) < 1 || Number(row.units) > 6) {
            return `Invalid units "${row.units}". Must be between 1 and 6.`;
          }
          if (Number(row.hours) < 1) {
            return `Invalid hours "${row.hours}". Must be at least 1.`;
          }
          if (Number(row.student_count) < 1) {
            return `Invalid student_count "${row.student_count}". Must be at least 1.`;
          }

          // ✅ Validate that departments actually exist
          // Check primary department (if provided)
          if (deptCodeNorm) {
            const exists = departments.some(
              (d) => normalize(d.code) === deptCodeNorm
            );

            if (!exists) {
              return `Invalid department_code "${deptCodeNorm}"`;
            }
          }

          // Check shared departments
          const invalidShared = sharedCodes.find(
            (code) =>
              !departments.some((d) => normalize(d.code) === normalize(code))
          );

          if (invalidShared) {
            return `Invalid shared_department_code "${invalidShared}"`;
          }

          return null; // null = valid
        }}
        sampleRows={[
          // Departmental
          ["CS301", "Data Structures", "300", "3", "3", "120", "departmental", "STF001", "CS", "", ""],
          // Shared
          ["EE201", "Circuit Theory", "200", "2", "2", "200", "shared", "STF002", "EE", "MTH;PHY", ""],
          // General
          ["GNS101", "Communication", "100", "2", "2", "500", "general", "STF003", "", "", ""],
          // Grouped (two courses treated as one)
          ["CS401", "Software Eng I", "400", "3", "3", "90", "departmental", "STF004", "CS", "", "GRP1"],
          ["CS402", "Software Eng II", "400", "3", "3", "90", "departmental", "STF004", "CS", "", "GRP1"],
        ]}
        onUpload={async (rows) => {
          let saved = 0;
          const errors: string[] = [];

          for (const row of rows) {
            try {
              const type = String(row.course_type).toLowerCase() as "departmental" | "shared" | "general";
              const deptCode = String(row.department ?? "").toUpperCase();
              const sharedCodes = (row.shared_departments as unknown as string[]) ?? [];
              // Resolve primary department
              let primaryDept: Department | undefined;
              if (type !== "general") {
                primaryDept = departments.find((d) => d.code === deptCode);
                if (!primaryDept) {
                  errors.push(`[${row.code}] Unknown department_code: "${deptCode}"`);
                  continue;
                }
              }

              // Resolve shared departments
              let sharedDeptIds: number[] = [];
              if (type === "shared") {
                const missing: string[] = [];
                sharedDeptIds = sharedCodes.map((code) => {
                  const dept = departments.find((d) => d.code === code);
                  if (!dept) missing.push(code);
                  return dept?.id ?? -1;
                }).filter((id) => id !== -1);

                if (missing.length > 0) {
                  errors.push(`[${row.code}] Unknown shared dept codes: ${missing.join(", ")}`);
                  continue;
                }
              }

              // Resolve lecturer
              const staffId = String(row.lecturer ?? "").trim();
              const lecturer = staffId
                ? lecturers.find((l) => l.staff_id === staffId)
                : undefined;

              if (staffId && !lecturer) {
                errors.push(`[${row.code}] Unknown lecturer_staff_id: "${staffId}"`);
                continue;
              }

              await courseApi.add({
                code: String(row.code),
                name: String(row.name),
                level: Number(row.level) as 100 | 200 | 300 | 400 | 500,
                units: Number(row.units),
                hours: Number(row.hours),
                student_count: Number(row.student_count),
                course_type: type,
                department: primaryDept?.id ?? null,
                shared_departments: sharedDeptIds,
                lecturer: lecturer?.id ?? null,
                group_id: String(row.shared_session_id ?? "").trim() || null,
              } as unknown as Course);

              saved++;
            } catch (e) {
              errors.push(`[${row.code}] ${(e as Error).message}`);
            }
          }

          return { saved, skipped: 0, errors };
        }}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
