"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import DepartmentForm from "@/components/DepartmentForm";
import { departmentApi } from "@/lib/api";
import { Department } from "@/lib/types";

export default function DepartmentsPage() {
  const [data, setData] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; row?: Department }>({
    open: false,
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const load = useCallback(() => {
    departmentApi.getAll().then(setData).catch(console.error);
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
        console.error(err);
        setToast({ message: "An error occurred.", type: "error" });
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
        console.error(err);
        setToast({ message: "An error occurred.", type: "error" });
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
        ]}
        onAdd={() => setModal({ open: true })}
        onEdit={(row) => setModal({ open: true, row })}
        onDelete={(id) => handleDelete(Number(id))}
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
