"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import LecturerForm from "@/components/LecturerForm";
import { lecturerApi } from "@/lib/api";
import { Lecturer, DAYS } from "@/lib/types";

const DAY_SHORT: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
};

const DAY_COLORS: Record<string, string> = {
  Monday: "bg-green-600/35 border-green-600/30 text-green-600",
  Tuesday: "bg-black/15 border-black/30 text-black/70",
  Wednesday: "bg-orange-700/15 border-orange-700/30 text-orange-600",
  Thursday: "bg-rose-500/15 border-rose-500/30 text-rose-400",
  Friday: "bg-purple-600/15 border-purple-600/30 text-purple-400",
};

function getDayColor(day: string): string {
  return DAY_COLORS[day] ?? "bg-slate-700/40 border-slate-600 text-slate-300";
}

export default function LecturersPage() {
  const [data, setData] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; row?: Lecturer }>({
    open: false,
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const load = useCallback(() => {
    lecturerApi.getAll().then(setData).catch(console.error);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = (body: Lecturer) => {
    setLoading(true);
    const apiCall = modal.row?.id
      ? lecturerApi.update(modal.row.id, body)
      : lecturerApi.add(body);

    apiCall
      .then(() => {
        setToast({
          message: `Lecturer ${modal.row ? "updated" : "added"}.`,
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
    if (!confirm("Delete this lecturer?")) return;
    lecturerApi
      .remove(id)
      .then(() => {
        setToast({ message: "Lecturer deleted.", type: "success" });
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
        title="Lecturers"
        data={data}
        columns={[
          {
            key: "staff_id",
            label: "Staff ID",
            filterable: true,
            render: (r) => <span className="font-mono">{r.staff_id}</span>,
          },
          {
            key: "first_name",
            label: "Name",
            filterable: true,
            render: (r) => (
              <span className="font-medium text-black/60">
                {r.first_name} {r.last_name}
              </span>
            ),
          },
          { key: "email", label: "Email", filterable: true },
          {
            key: "unavailable_days",
            label: "Available Days",
            render: (r) => {
              const unavailable = r.unavailable_days?.map((d) => d.day) || [];
              const available = DAYS.filter((d) => !unavailable.includes(d));
              return (
                <div className="flex flex-wrap gap-1">
                  {available.map((d) => (
                    <span
                      key={d}
                      className={`px-2 py-0.5 rounded-md text-xs font-mono border ${getDayColor(
                        d
                      )}`}
                    >
                      {DAY_SHORT[d] ?? d}
                    </span>
                  ))}
                </div>
              );
            },
          },
        ]}
        onAdd={() => setModal({ open: true })}
        onEdit={(row) => setModal({ open: true, row })}
        onDelete={(id) => handleDelete(Number(id))}
      />

      <Modal
        title={modal.row ? "Edit Lecturer" : "Add Lecturer"}
        open={modal.open}
        onClose={() => setModal({ open: false })}
      >
        <LecturerForm
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
