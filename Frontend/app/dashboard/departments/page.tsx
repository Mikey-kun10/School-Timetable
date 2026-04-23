"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import DepartmentForm from "@/components/DepartmentForm";
import CSVUploadModal from "@/components/ui/CSVUploadModal";
import { departmentApi, collegeApi, ApiError } from "@/lib/api";
import { Department, College } from "@/lib/types";

export default function DepartmentsPage() {
  const [data, setData] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; row?: Department }>({
    open: false,
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const load = useCallback(() => {
    departmentApi.getAll().then(setData)

    Promise.all([departmentApi.getAll(), collegeApi.getAll()]).then(([department, cols]) => {
      setData(department);
      setColleges(cols);
    }).catch((err) => {
      if (!(err instanceof ApiError) || err.status >= 500) {
        console.error(err);
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = (body: Department) => {
    setLoading(true);
    const apiCall = modal.row?.id
      ? departmentApi.update(modal.row.id, body)
      : departmentApi.add(body);

    apiCall
      .then(() => {
        setToast({
          message: `Department ${modal.row ? "updated" : "added"}.`,
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
    if (!confirm("Delete this department?")) return;
    departmentApi
      .remove(id)
      .then(() => {
        setToast({ message: "Department deleted.", type: "success" });
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
        title="Departments"
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
          { key: "name", label: "Name", filterable: true },
          {
            key: "colleges",
            label: "Colleges",
            filterable: true,
            filterOptions: colleges.map((c) => c.code),
            filterValue: (r) => {
              return colleges.find((col) => col.id === r.college)?.code ?? "";
            },
            render: (r) => {
              return colleges.find((col) => col.id === r.college)?.code ?? "";
            },
          },
        ]}
        onAdd={() => setModal({ open: true })}
        onEdit={(row) => setModal({ open: true, row })}
        onDelete={(id) => handleDelete(Number(id))}
        onImport={() => setCsvOpen(true)}
      />

      <Modal
        title={modal.row ? "Edit Department" : "Add Department"}
        open={modal.open}
        onClose={() => setModal({ open: false })}
      >
        <DepartmentForm
          initial={modal.row}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </Modal>

      <CSVUploadModal
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onDone={() => { setCsvOpen(false); load(); }}
        entityName="Department"
        uniqueKey="code"
        existingData={data}
        columns={[
          { csvHeader: "name", key: "name", label: "Name", required: true },
          {
            csvHeader: "code",
            key: "code",
            label: "Code",
            required: true,
            transform: (v) => String(v).toUpperCase()
          },
          {
            csvHeader: "college_code",
            key: "college",
            label: "College Code",
            required: true,
            transform: (v) => String(v).toUpperCase()
          },
        ]}
        validateRow={(row) => {
          const college = String(row.college ?? "").trim();

          if (!college) {
            return `College is required.`;
          }

          // If no colleges exist yet in the DB, reject all rows with a clear message
          if (colleges.length === 0) {
            return `No colleges exist in the system yet. Add at least one department with a college first.`;
          }

          // Check if the college matches any existing college value (case-insensitive)
          const match = colleges.some(
            (c) => c.code.toLowerCase() === college.toLowerCase()
          );

          if (!match) {
            return `College "${college}" does not match any existing college. Valid colleges: ${colleges.join(", ")}`;
          }

          return null;
        }}
        sampleRows={[
          ["Computer Science", "CS", "COE"],
          ["Electrical Engineering", "EE", "COE"],
          ["Mathematics", "MTH", "COS"],
        ]}
        onUpload={async (rows) => {
          let saved = 0;
          const errors: string[] = [];

          // Build lookup map (code -> college)
          for (const row of rows) {
            try {
              const normalize = (val: any) =>
                String(val).trim().toUpperCase();

              const college = colleges.find(
                (c) => normalize(c.code) === normalize(row.college)
              );

              if (!college) {
                errors.push(`Invalid college code: ${row.college}`);
                continue;
              }

              await departmentApi.add({
                name: String(row.name),
                code: String(row.code),
                college: college.id, // <-- critical mapping
              } as unknown as Department);

              saved++;
            } catch (e) {
              errors.push(`${row.code}: ${(e as Error).message}`);
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
