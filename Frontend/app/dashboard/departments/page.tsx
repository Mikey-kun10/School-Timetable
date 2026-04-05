"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import DepartmentForm from "@/components/DepartmentForm";
import { departmentStore } from "@/lib/store";
import { Department, COLLEGES } from "@/lib/types";

export default function DepartmentsPage() {
  const [data, setData] = useState<Department[]>([]);
  const [modal, setModal] = useState<{ open: boolean; row?: Department }>({
    open: false,
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const load = useCallback(() => {
    setData(departmentStore.getAll());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = (body: {
    name: string;
    code: string;
    college: string;
    studentCount: number;
    level: string;
  }) => {
    if (modal.row) {
      departmentStore.update(modal.row.id, body);
      setToast({ message: "Department updated.", type: "success" });
    } else {
      departmentStore.add(body);
      setToast({ message: "Department added.", type: "success" });
    }
    setModal({ open: false });
    load();
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this department?")) return;
    departmentStore.remove(id);
    setToast({ message: "Department deleted.", type: "success" });
    load();
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
          { key: "name", label: "Name", filterable: true, },
          { key: "college", label: "College", filterable: true, filterOptions: COLLEGES.map(obj => obj.code)},
          {
            key: "level",
            label: "Level",
            filterable: true,
            filterOptions: ["100", "200", "300", "400", "500"],
            render: (r) => `${r.level} Level`,
          },
          {
            key: "studentCount",
            label: "Students",
            render: (r) => (
              <span className="font-mono text-black/30">{r.studentCount}</span>
            ),
          },
        ]}
        onAdd={() => setModal({ open: true })}
        onEdit={(row) => setModal({ open: true, row })}
        onDelete={handleDelete}
      />

      <Modal
        title={modal.row ? "Edit Department" : "Add Department"}
        open={modal.open}
        onClose={() => setModal({ open: false })}
      >
        <DepartmentForm initial={modal.row} onSubmit={handleSubmit} />
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
