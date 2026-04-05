"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import LecturerForm from "@/components/LecturerForm";
import { lecturerStore } from "@/lib/store";
import type { Lecturer } from "@/lib/types";
import { COLLEGES } from "@/lib/types";

const DAY_SHORT: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
};
const DAY_COLORS: Record<string, string> = {
  "Monday": "bg-green-600/35 border-green-600/30 text-green-600",
  "Tuesday": "bg-black/15 border-black/30 text-black/70",
  "Wednesday": "bg-orange-700/15 border-orange-700/30 text-orange-600",
  "Thursday": "bg-rose-500/15 border-rose-500/30 text-rose-400",
  "Friday": "bg-purple-600/15 border-purple-600/30 text-purple-400",
};

function getDayColor(level: string): string {
  return DAY_COLORS[level] ?? "bg-slate-700/40 border-slate-600 text-slate-300";
}
export default function LecturersPage() {
  const [data, setData] = useState<Lecturer[]>([]);
  const [modal, setModal] = useState<{ open: boolean; row?: Lecturer }>({
    open: false,
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const load = useCallback(() => setData(lecturerStore.getAll()), []);
  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = (body: Omit<Lecturer, "id">) => {
    if (modal.row) {
      lecturerStore.update(modal.row.id, body);
      setToast({ message: "Lecturer updated.", type: "success" });
    } else {
      lecturerStore.add(body);
      setToast({ message: "Lecturer added.", type: "success" });
    }
    setModal({ open: false });
    load();
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this lecturer?")) return;
    lecturerStore.remove(id);
    setToast({ message: "Lecturer deleted.", type: "success" });
    load();
  };

  return (
    <>
      <DataTable
        title="Lecturers"
        data={data}
        columns={[
          {
            key: "name",
            label: "Name", filterable: true,
            render: (r) => (
              <span className="font-medium text-black/30">{r.name}</span>
            ),
          },
          { key: "email", label: "Email", filterable: true },
          { key: "college", label: "College", filterable: true, filterOptions: COLLEGES.map(obj => obj.code) },
          {
            key: "availableDays",
            label: "Available Days", filterable: true, filterOptions: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                {r.availableDays.map((d) => (
                  <span
                    key={d}
                    className={`px-2 py-0.5 rounded-md text-xs font-mono border ${getDayColor(d)}`}
                  >
                    {DAY_SHORT[d] ?? d}
                  </span>
                ))}
              </div>
            ),
          },
        ]}
        onAdd={() => setModal({ open: true })}
        onEdit={(row) => setModal({ open: true, row })}
        onDelete={handleDelete}
      />

      <Modal
        title={modal.row ? "Edit Lecturer" : "Add Lecturer"}
        open={modal.open}
        onClose={() => setModal({ open: false })}
      >
        <LecturerForm initial={modal.row} onSubmit={handleSubmit} />
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
