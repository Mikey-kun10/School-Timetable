"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import HallForm from "@/components/HallForm";
import { hallApi, collegeApi, ApiError } from "@/lib/api";
import { Hall, College } from "@/lib/types";

export default function HallsPage() {
  const [data, setData] = useState<Hall[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; row?: Hall }>({
    open: false,
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const load = useCallback(() => {
    Promise.all([hallApi.getAll(), collegeApi.getAll()])
      .then(([halls, cols]) => {
        setData(halls);
        setColleges(cols);
      })
      .catch((err) => {
        if (!(err instanceof ApiError) || err.status >= 500) {
          console.error(err);
        }
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = (body: Hall) => {
    setLoading(true);
    const apiCall = modal.row?.id
      ? hallApi.update(modal.row.id, body)
      : hallApi.add(body);

    apiCall
      .then(() => {
        setToast({
          message: `Hall ${modal.row ? "updated" : "added"}.`,
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
    if (!confirm("Delete this hall?")) return;
    hallApi
      .remove(id)
      .then(() => {
        setToast({ message: "Hall deleted.", type: "success" });
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
        title="Halls"
        data={data}
        columns={[
          {
            key: "name",
            label: "Hall Name",
            filterable: true,
            render: (r) => (
              <span className="font-medium text-black/60">{r.name}</span>
            ),
          },
          {
            key: "capacity",
            label: "Capacity",
            render: (r) => <span className="font-mono">{r.capacity}</span>,
          },
          {
            key: "hall_type",
            label: "Type",
            filterable: true,
            filterOptions: ["college", "shared", "general"],
            render: (r) => (
              <span className="capitalize">{r.hall_type}</span>
            ),
          },
          {
            key: "colleges",
            label: "Colleges",
            filterable: true,
            filterOptions: colleges.map((c) => c.code),
            filterValue: (r) => {
              if (r.hall_type === "general") return colleges.map((c) => c.code);
              return r.colleges.map((c) => {
                const id = typeof c === "object" ? c.id : c;
                const col = colleges.find((col) => col.id === id);
                return col?.code ?? String(id);
              });
            },
            render: (r) => {
              if (r.hall_type === "general") return "All";
              return r.colleges
                .map((c) => {
                  const id = typeof c === "object" ? c.id : c;
                  const col = colleges.find((col) => col.id === id);
                  return col?.code || String(id);
                })
                .join(", ");
            },
          }
        ]}
        onAdd={() => setModal({ open: true })}
        onEdit={(row) => setModal({ open: true, row })}
        onDelete={(id) => handleDelete(Number(id))}
      />

      <Modal
        title={modal.row ? "Edit Hall" : "Add Hall"}
        open={modal.open}
        onClose={() => setModal({ open: false })}
      >
        <HallForm
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
