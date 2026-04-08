"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import HallForm from "@/components/HallForm";
import { hallApi, departmentApi } from "@/lib/api";
import { Hall, Department } from "@/lib/types";

export default function HallsPage() {
  const [data, setData] = useState<Hall[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; row?: Hall }>({
    open: false,
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const load = useCallback(() => {
    Promise.all([hallApi.getAll(), departmentApi.getAll()])
      .then(([halls, depts]) => {
        setData(halls);
        setDepartments(depts);
      })
      .catch(console.error);
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
        console.error(err);
        setToast({ message: "An error occurred.", type: "error" });
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
        console.error(err);
        setToast({ message: "An error occurred.", type: "error" });
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
            filterOptions: ["department", "shared", "general"],
            render: (r) => (
              <span className="capitalize">{r.hall_type}</span>
            ),
          },
          {
            key: "departments",
            label: "Departments",
            render: (r) => {
               if (r.hall_type === "general") return "All";
               return r.departments.map(id => {
                 const dept = departments.find(d => d.id === id);
                 return dept?.code || id;
               }).join(", ");
            }
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
