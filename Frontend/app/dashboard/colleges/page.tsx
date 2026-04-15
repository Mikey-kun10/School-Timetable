"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import CollegeForm from "@/components/CollegeForm";
import { collegeApi, ApiError } from "@/lib/api";
import { College } from "@/lib/types";

export default function CollegesPage() {
  const [data, setData] = useState<College[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; row?: College }>({
    open: false,
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const load = useCallback(() => {
    collegeApi.getAll().then(setData).catch((err) => {
      if (!(err instanceof ApiError) || err.status >= 500) {
        console.error(err);
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = (body: College) => {
    setLoading(true);
    const apiCall = modal.row?.id
      ? collegeApi.update(modal.row.id, body)
      : collegeApi.add(body);

    apiCall
      .then(() => {
        setToast({
          message: `College ${modal.row ? "updated" : "added"}.`,
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
    if (!confirm("Delete this college?")) return;
    collegeApi
      .remove(id)
      .then(() => {
        setToast({ message: "College deleted.", type: "success" });
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
        title="Colleges"
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
        title={modal.row ? "Edit College" : "Add College"}
        open={modal.open}
        onClose={() => setModal({ open: false })}
      >
        <CollegeForm
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
