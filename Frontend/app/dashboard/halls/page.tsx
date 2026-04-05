"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import HallForm from "@/components/HallForm";
import { hallStore } from "@/lib/store";
import type { Hall } from "@/lib/types";
import { COLLEGES } from "@/lib/types";

function CapacityBar({ capacity }: { capacity: number }) {
  const max = 500;
  const pct = Math.min((capacity / max) * 100, 100);
  const color =
    capacity >= 300
      ? "bg-emerald-500"
      : capacity >= 100
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 max-w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-sm text-slate-300">{capacity}</span>
    </div>
  );
}

export default function HallsPage() {
  const [data, setData] = useState<Hall[]>([]);
  const [modal, setModal] = useState<{ open: boolean; row?: Hall }>({
    open: false,
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const load = useCallback(() => setData(hallStore.getAll()), []);
  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = (body: Omit<Hall, "id">) => {
    if (modal.row) {
      hallStore.update(modal.row.id, body);
      setToast({ message: "Hall updated.", type: "success" });
    } else {
      hallStore.add(body);
      setToast({ message: "Hall added.", type: "success" });
    }
    setModal({ open: false });
    load();
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this hall?")) return;
    hallStore.remove(id);
    setToast({ message: "Hall deleted.", type: "success" });
    load();
  };

  return (
    <>
      <DataTable
        title="Halls"
        data={data}
        columns={[
          {
            key: "code",
            label: "Code",
            render: (r) => (
              <span className="font-mono text-blue-400">{r.code}</span>
            ),
          },
          {
            key: "name",
            label: "Hall Name",
            render: (r) => (
              <span className="font-medium text-black/30">{r.name}</span>
            ),
          },
          {
            key: "capacity",
            label: "Capacity",
          },
          { key: "college", label: "College", filterable: true, filterOptions: COLLEGES.map(obj => obj.code) },
        ]}
        onAdd={() => setModal({ open: true })}
        onEdit={(row) => setModal({ open: true, row })}
        onDelete={handleDelete}
      />

      <Modal
        title={modal.row ? "Edit Hall" : "Add Hall"}
        open={modal.open}
        onClose={() => setModal({ open: false })}
      >
        <HallForm initial={modal.row} onSubmit={handleSubmit} />
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
