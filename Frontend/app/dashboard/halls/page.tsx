"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import HallForm from "@/components/HallForm";
import CSVUploadModal from "@/components/ui/CSVUploadModal";
import { hallApi, collegeApi, ApiError } from "@/lib/api";
import { Hall, College } from "@/lib/types";

export default function HallsPage() {
  const [data, setData] = useState<Hall[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
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
              <span className="font-medium text-blue-400">{r.name}</span>
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
        onImport={() => setCsvOpen(true)}
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

      <CSVUploadModal
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onDone={() => { setCsvOpen(false); load(); }}
        entityName="Hall"
        uniqueKey="name"
        existingData={data.map((h) => ({ ...h, id: String(h.id) }))}

        columns={[
          { csvHeader: "name", key: "name", label: "Hall Name", required: true },

          {
            csvHeader: "capacity",
            key: "capacity",
            label: "Capacity",
            required: true,
            transform: (v) => Number(v)
          },

          {
            csvHeader: "hall_type",
            key: "hall_type",
            label: "Type (general | college | shared)",
            transform: (v) => String(v || "general").toLowerCase()
          },

          {
            csvHeader: "colleges",
            key: "colleges",
            label: "College Code(s)",
            transform: (v) =>
              String(v || "")
                .split(",")
                .map((c) => c.trim().toUpperCase())
                .filter(Boolean),
          }
        ]}

        sampleRows={[
          ["LT1", "200", "general", ""],
          ["Hall A", "80", "college", "COE"],
          ["Hall B", "120", "shared", "COE,COS"],
        ]}

        onUpload={async (rows) => {
          let saved = 0;
          const errors: string[] = [];

          const normalize = (v: any) =>
            String(v).trim().toUpperCase();

          const collegeMap = new Map(
            colleges.map((c) => [normalize(c.code), c])
          );

          for (const row of rows) {
            try {

              console.log("RAW row.colleges:", row.colleges);
              console.log("TYPE:", typeof row.colleges);

              const hallType = row.hall_type as "general" | "college" | "shared";

              if (!["general", "college", "shared"].includes(hallType)) {
                errors.push(`${row.name}: Invalid hall type ${hallType}`);
                continue;
              }

              let collegeIds: number[] = [];

              if (hallType === "college") {
                const codes = (row.colleges ?? [])
                  .map((c: any) => {
                    if (typeof c === "string") return c;
                    if (typeof c === "number") return String(c);
                    return c.code;
                  })
                  .map((c) => c.trim().toUpperCase())
                  .filter(Boolean);

                if (codes.length !== 1) {
                  errors.push(`${row.name}: College-type hall must have exactly one college`);
                  continue;
                }

                const code = codes[0];

                const col = collegeMap.get(code);

                if (!col || col.id === undefined) {
                  errors.push(`${row.name}: Invalid college code ${code}`);
                  continue;
                }

                collegeIds = [col.id];
              }

              else if (hallType === "shared") {
                const ids: number[] = [];

                for (const raw of row.colleges || []) {
                  const code = normalize(raw);

                  const col = collegeMap.get(code);

                  if (!col || col.id === undefined) {
                    errors.push(`${row.name}: Invalid college code ${code}`);
                    continue;
                  }

                  if (!ids.includes(col.id)) {
                    ids.push(col.id); // prevents duplicates
                  }
                }

                if (ids.length === 0) {
                  errors.push(`${row.name}: No valid colleges provided for shared hall`);
                  continue;
                }

                collegeIds = ids;
              }

              // general → leave empty array

              await hallApi.add({
                name: String(row.name),
                capacity: Number(row.capacity),
                hall_type: hallType ?? "general",
                colleges: collegeIds,
              });

              saved++;
            } catch (e) {
              errors.push(`${row.name}: ${(e as Error).message}`);
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
