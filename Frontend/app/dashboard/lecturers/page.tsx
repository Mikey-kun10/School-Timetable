"use client";

import { useEffect, useState, useCallback } from "react";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import LecturerForm from "@/components/LecturerForm";
import { lecturerApi, collegeApi, ApiError } from "@/lib/api";
import CSVUploadModal from "@/components/ui/CSVUploadModal";
import { Lecturer, College, DAYS, UnavailabilityBlock } from "@/lib/types";

type Block = {
  id: number;
  day: string;
  start_hour: number;
  end_hour: number;
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


  const START_HOUR = 8;
  const END_HOUR = 18; // exclusive
  const getAvailableSlotsForDay = (blocks: Block[]) => {
    if (!blocks.length) {
      return [`${START_HOUR}-${END_HOUR}`];
    }

    // Extract and normalize intervals
    const unavailable = blocks
      .map(b => ({
        start: b.start_hour,
        end: b.end_hour,
      }))
      .sort((a, b) => a.start - b.start);

    let current = START_HOUR;
    const slots: string[] = [];

    for (const u of unavailable) {
      if (current < u.start) {
        slots.push(`${current}-${u.start}`);
      }
      current = Math.max(current, u.end);
    }

    // remaining time after last block
    if (current < END_HOUR) {
      slots.push(`${current}-${END_HOUR}`);
    }

    return slots;
  };

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
              <span className="font-medium text-blue-400 text-nowrap">
                {r.first_name} {r.last_name}
              </span>
            ),
          },
          { key: "email", label: "Email", filterable: true },
          {
            key: "mon", label: "Mon", render: (r) => {
              const availableMap = getAvailableSlotsForDay(r.unavailable_days?.filter((d) => d.day === "Monday") ?? []);
              return (
                <div className="flex flex-col gap-1 items-start">
                  {availableMap.map((slot, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded-md text-xs font-mono border text-nowrap ${getDayColor("Monday")}`}
                    >
                      {slot}
                    </span>
                  ))}
                </div>
              )
            },
          },
          {
            key: "tue", label: "Tue", render: (r) => {
              const availableMap = getAvailableSlotsForDay(r.unavailable_days?.filter((d) => d.day === "Tuesday") ?? []);
              return (
                <div className="flex flex-col gap-1 items-start">
                  {availableMap.map((slot, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded-md text-xs font-mono border text-nowrap ${getDayColor("Tuesday")}`}
                    >
                      {slot}
                    </span>
                  ))}
                </div>
              )
            },
          },
          {
            key: "wed", label: "Wed", render: (r) => {
              const availableMap = getAvailableSlotsForDay(r.unavailable_days?.filter((d) => d.day === "Wednesday") ?? []);
              return (
                <div className="flex flex-col gap-1 items-start">
                  {availableMap.map((slot, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded-md text-xs font-mono border text-nowrap ${getDayColor("Wednesday")}`}
                    >
                      {slot}
                    </span>
                  ))}
                </div>
              )
            },
          },
          {
            key: "thu", label: "Thu", render: (r) => {
              const availableMap = getAvailableSlotsForDay(r.unavailable_days?.filter((d) => d.day === "Thursday") ?? []);
              return (
                <div className="flex flex-col gap-1 items-start">
                  {availableMap.map((slot, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded-md text-xs font-mono border text-nowrap ${getDayColor("Thursday")}`}
                    >
                      {slot}
                    </span>
                  ))}
                </div>
              )
            },
          },
          {
            key: "fri", label: "Fri", render: (r) => {
              const availableMap = getAvailableSlotsForDay(r.unavailable_days?.filter((d) => d.day === "Friday") ?? []);
              return (
                <div className="flex flex-col gap-1 items-start">
                  {availableMap.map((slot, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded-md text-xs font-mono border text-nowrap ${getDayColor("Friday")}`}
                    >
                      {slot}
                    </span>
                  ))}
                </div>
              )
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
      {/* // {
        //   key: "unavailable_days",
        //   label: "Available Days",
        //   render: (r) => {
        //     const availableMap = getAvailableSlots(r.unavailable_days ?? []);

        //     if (Object.keys(availableMap).length === 0) {
        //       return "No Availability";
        //     }

        //     return (
        //       <div className="flex flex-col gap-1">
        //         {Object.entries(availableMap).map(([day, slots]) => (
        //           <div key={day} className="flex flex-wrap gap-1 items-center">
        //             <span className={`px-1 py-0.5 rounded-md font-mono border text-xs ${getDayColor(day)}`}>
        //               {DAY_SHORT[day] ?? day}:
        //             </span>

        //             {slots.map((slot, i) => (
        //               <span
        //                 key={i}
        //                 className="px-2 py-0.5 rounded-md text-xs font-mono border"
        //               >
        //                 {slot}
        //               </span>
        //             ))}
        //           </div>
        //         ))}
        //       </div>
        //     );
        //   },
        // }, */}

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
          { csvHeader: "email", key: "email", label: "Email", required: true },
          { csvHeader: "college_code", key: "college", label: "College Code", required: true, transform: (v) => String(v).toUpperCase() },
          {
            csvHeader: "unavailable_days",
            key: "unavailable_days_input",
            label: "Unavailable Days",
            transform: (v) => {
              if (!v) return [];

              return String(v)
                .split(";") // split days
                .flatMap((dayPart) => {
                  const [day, times] = dayPart.split(":");

                  if (!day || !times) return [];

                  return times.split("|").map((range) => {
                    const [start, end] = range.split("-").map(Number);

                    return {
                      day: day.trim(),
                      start_hour: start,
                      end_hour: end,
                    };
                  });
                });
            }
          },
        ]}
        validateRow={(row) => {
          const college = String(row.college ?? "").trim();

          if (!college) {
            return `College is required.`;
          }

          // If no colleges exist yet in the DB, reject all rows with a clear message
          if (colleges.length === 0) {
            return `No colleges exist in the system yet. Add at least one department with a college first.`;
          }

          // Check if the college matches any existing college value (case-insensitive)
          const match = colleges.some(
            (c) => c.code.toLowerCase() === college.toLowerCase()
          );

          if (!match) {
            return `College "${college}" does not match any existing college. Valid colleges: ${colleges.join(", ")}`;
          }

          // Vlidate max uavailble day and time slotes
          const blocks = row.unavailable_days_input as UnavailabilityBlock[];

          if (blocks && blocks.length > 0) {
            for (const b of blocks) {
              if (
                isNaN(b.start_hour) ||
                isNaN(b.end_hour) ||
                b.start_hour >= b.end_hour
              ) {
                return `Invalid time range in ${b.day}`;
              }
            }

            // Total hours validation 
            const totalHoursUnavailable = blocks.reduce(
              (acc, b) => acc + (b.end_hour - b.start_hour),
              0
            );

            if (totalHoursUnavailable >= 50) {
              return "Lecturer must be available for at least one hour.";
            }
          }


          return null;
        }}
        sampleRows={[
          ["John", "Smith", "STF001", "j.smith@uni.edu", "CS", "Monday:8-10|12-14"],
          ["Alice", "Jones", "STF002", "a.jones@uni.edu", "EE", "Tuesday:10-12"],
          ["Bob", "Brown", "STF003", "", "MTH", "Monday:9-11;Friday:14-18"],]}
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
                unavailable_days_input: row.unavailable_days_input as UnavailabilityBlock[],
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
