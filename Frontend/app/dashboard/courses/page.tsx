"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import CourseForm from "@/components/CourseForm";
import { courseApi, lecturerApi, departmentApi } from "@/lib/api";
import { Course, Lecturer, Department } from "@/lib/types";

interface CourseExtended extends Course {
  lecturerName: string;
  deptCode: string;
}

export default function CoursesPage() {
  const [data, setData] = useState<CourseExtended[]>([]);
  const [loading, setLoading] = useState(false);
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
      const joined = courses.map(c => ({
        ...c,
        lecturerName: lecturers.find(l => l.id === c.lecturer)?.first_name 
          ? `${lecturers.find(l => l.id === c.lecturer)?.first_name} ${lecturers.find(l => l.id === c.lecturer)?.last_name}`
          : "—",
        deptCode: depts.find(d => d.id === c.department)?.code ?? "—",
        shared_session_id: c.shared_session_id || "—"
      }));
      setData(joined);
    }).catch(console.error);
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
        console.error(err);
        setToast({ message: "An error occurred.", type: "error" });
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
        console.error(err);
        setToast({ message: "An error occurred.", type: "error" });
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
