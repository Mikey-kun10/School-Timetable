"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import LecturerForm from "@/components/LecturerForm";
import { lecturerApi, collegeApi, ApiError } from "@/lib/api";
import CSVUploadModal from "@/components/ui/CSVUploadModal";
import { Lecturer, College, DAYS } from "@/lib/types";

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
  const [colleges, setColleges] = useState<College[]>([]);
  const [csvOpen, setCsvOpen] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; row?: Lecturer }>({
    open: false,
  });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const load = useCallback(() => {
    Promise.all([lecturerApi.getAll(), collegeApi.getAll()]).then(([lecturer, cols]) => {
      setData(lecturer);
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
        if (!(err instanceof ApiError) || err.status >= 500) {
          console.error(err);
        }
        setToast({ message: err.message || "An error occurred.", type: "error" });
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
        if (!(err instanceof ApiError) || err.status >= 500) {
          console.error(err);
        }
        setToast({ message: err.message || "An error occurred.", type: "error" });
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
            filterValue: (r) => `${r.first_name} ${r.last_name}`,
            render: (r) => (
              <span className="font-medium text-blue-400">
                {r.first_name} {r.last_name}
              </span>
            ),
          },
          { key: "email", label: "Email", filterable: true },
          {
            key: "unavailable_days",
            label: "Available Days",
            render: (r) => {
              const unavailable = r.unavailable_days?.map((d: { day: string }) => d.day) || [];
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

      <CSVUploadModal
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onDone={() => { setCsvOpen(false); load(); }}
        entityName="Lecturer"
        uniqueKey="staff_id"
        existingData={data}
        columns={[
          { csvHeader: "first_name", key: "first_name", label: "First Name", required: true },
          { csvHeader: "last_name", key: "last_name", label: "Last Name", required: true },
          { csvHeader: "staff_id", key: "staff_id", label: "Staff ID", required: true },
          { csvHeader: "email", key: "email", label: "Email" },
          { csvHeader: "college_code", key: "college", label: "College Code", required: true, transform: (v) => String(v).toUpperCase() },
          {
            csvHeader: "unavailable_days",
            key: "unavailable_days_input",
            label: "Unavailable Days",
            transform: (v) => v ? v.split(";").map((d) => d.trim()) : [],
          },
        ]}
        sampleRows={[
          ["John", "Smith", "STF001", "j.smith@uni.edu", "CS", "Wednesday"],
          ["Alice", "Jones", "STF002", "a.jones@uni.edu", "EE", ""],
          ["Bob", "Brown", "STF003", "", "MTH", "Monday;Friday"],
        ]}
        onUpload={async (rows) => {
          let saved = 0;
          const errors: string[] = [];
          for (const row of rows) {
            try {
              const normalize = (val: any) =>
                String(val).trim().toUpperCase();

              const col = colleges.find(
                (c) => normalize(c.code) === normalize(row.college)
              );

              if (!col) {
                errors.push(`Unknown College code: ${row.college}`);
                continue;
              }
              await lecturerApi.add({
                first_name: String(row.first_name),
                last_name: String(row.last_name),
                staff_id: String(row.staff_id),
                email: String(row.email ?? ""),
                college: col.id,
                unavailable_days_input: (row.unavailable_days_input as string[]) ?? [],
              } as unknown as Lecturer);
              saved++;
            } catch (e) {
              errors.push(`${row.staff_id}: ${(e as Error).message}`);
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
