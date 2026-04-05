"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import CourseForm from "@/components/CourseForm";
import { courseStore, lecturerStore } from "@/lib/store";
import type { Course } from "@/lib/types";
import { COLLEGES } from "@/lib/types";

interface CourseWithLecturer extends Course {
  lecturerName: string;
}

export default function CoursesPage() {
  const [data, setData] = useState<CourseWithLecturer[]>([]);
  const [modal, setModal] = useState<{
    open: boolean;
    row?: CourseWithLecturer;
  }>({ open: false });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const load = useCallback(() => {
    const courses = courseStore.getAll();
    const lecturers = lecturerStore.getAll();

    // Join lecturer name onto each course for display
    const joined = courses.map((c) => ({
      ...c,
      lecturerName: lecturers.find((l) => l.id === c.lecturerId)?.name ?? "—",
    }));

    setData(joined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = (body: Omit<Course, "id">) => {
    setSaving(true);
    if (modal.row) {
      courseStore.update(modal.row.id, body);
      setToast({ message: "Course updated.", type: "success" });
    } else {
      courseStore.add(body);
      setToast({ message: "Course added.", type: "success" });
    }
    setSaving(false);
    setModal({ open: false });
    load();
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this course?")) return;
    courseStore.remove(id);
    setToast({ message: "Course deleted.", type: "success" });
    load();
  };

  return (
    <>
      <DataTable
        title="Courses"
        data={data}
        columns={[
          {
            key: "courseCode",
            label: "Code",
            filterable: true,
            render: (r) => (
              <span className="font-mono text-blue-400">{r.courseCode}</span>
            ),
          },
          { key: "title", label: "Title", filterable: true },
          {
            key: "level",
            label: "Level",
            render: (r) => `${r.level} Level`,
          },
          { key: "college", label: "College", filterable: true, filterOptions: COLLEGES.map(obj => obj.code) },
          {
            key: "duration",
            label: "Duration",
            filterable: true,
            filterOptions: ["100", "200", "300", "400", "500"],
            render: (r) => `${r.duration}h`,
          },
          {
            key: "lecturerName",
            label: "Lecturer",
            filterable: true,
            render: (r) => r.lecturerName,
          },
          {
            key: "departments",
            label: "Depts",
            render: (r) => (
              <span className="font-mono text-xs text-slate-400">
                {r.departments.join(", ")}
              </span>
            ),
          },
        ]}
        onAdd={() => setModal({ open: true })}
        onEdit={(row) => { console.log(row); setModal({ open: true, row }) }}
        onDelete={handleDelete}
      />

      <Modal
        title={modal.row ? "Edit Course" : "Add Course"}
        open={modal.open}
        onClose={() => setModal({ open: false })}
      >
        <CourseForm
          initial={
            modal.row
              ? {
                courseCode: modal.row.courseCode,
                title: modal.row.title,
                duration: modal.row.duration,
                level: modal.row.level,
                college: modal.row.college,
                departments: modal.row.departments,
                lecturerId: modal.row.lecturerId,
                departmentId: modal.row.departmentId,
              }
              : undefined
          }
          onSubmit={handleSubmit}
          loading={saving}
        />
      </Modal>

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
