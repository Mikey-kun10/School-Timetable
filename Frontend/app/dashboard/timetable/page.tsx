"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, RefreshCw, Filter, Printer, AlertTriangle, Clock } from "lucide-react";
import { timetableApi, departmentApi, hallApi, courseApi, ApiError } from "@/lib/api";
import { DAYS, TIME_SLOTS, LEVELS, Department, TimetableEntry, createParamCounter } from "@/lib/types";
import Toast from "@/components/ui/Toast";

const GRID_SLOTS = [
  { label: "8:00 - 9:00", start: 8 },
  { label: "9:00 - 10:00", start: 9 },
  { label: "10:00 - 11:00", start: 10 },
  { label: "11:00 - 12:00", start: 11 },
  { label: "12:00 - 01:00", start: 12 },
  { label: "01:00 - 02:00", start: 13 },
  { label: "02:00 - 03:00", start: 14 },
  { label: "03:00 - 04:00", start: 15 },
  { label: "04:00 - 05:00", start: 16 },
  { label: "05:00 - 06:00", start: 17 },
];

interface UnscheduledItem {
  course: string;
  reason: string;
}

interface Stats {
  courses: number;
  halls: number;
}

// ── level colours ─────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  "100": "bg-green-200 border-green-600/30 text-green-600",
  "200": "bg-gray-200 border-black/30 text-black/70",
  "300": "bg-orange-100 border-orange-700/30 text-orange-600",
  "400": "bg-rose-100 border-rose-500/30 text-rose-400",
  "500": "bg-purple-100 border-purple-600/30 text-purple-400",
};

function getLevelColor(level: string): string {
  return LEVEL_COLORS[level] ?? "bg-slate-700/40 border-slate-600 text-slate-300";
}

const selectCls = `
  px-3 py-1.5 text-xs rounded-lg bg-white border border-blue-400
  text-black/60 focus:outline-none focus:ring-4
  focus:ring-blue-400/70 transition-all cursor-pointer
`;




// ── timetable cell ────────────────────────────────────────────────────────────

function TimetableCell({ key, entries }: { key: string, entries: TimetableEntry[] }) {
  if (entries.length === 0) return
  console.log(entries);

  const maxDuration = Math.max(
    ...entries.map(e => e.time_slot.duration)
  );
  const spanClass = (duration: number) => {
    switch (duration) {
      case 1:
        return ("col-span-1");
      case 2:
        return ("col-span-2");
      case 3:
        return ("col-span-3");
      case 4:
        return ("col-span-4");

      default:
        break;
    }
  };
  const counter = createParamCounter();
  const columnPositioning = (start: number) => {
    let rowStart = counter(start as number);
    switch (start) {
      case 8:
        return ("col-start-2" + " " + "row-start-" + `${rowStart}` + " " + `${rowStart === 1 ? "mt-4" : ""}`);
      case 9:
        return ("col-start-3" + " " + "row-start-" + `${rowStart}` + " " + `${rowStart === 1 ? "mt-4" : ""}`);
      case 10:
        return ("col-start-4" + " " + "row-start-" + `${rowStart}` + " " + `${rowStart === 1 ? "mt-4" : ""}`);
      case 11:
        return ("col-start-5" + " " + "row-start-" + `${rowStart}` + " " + `${rowStart === 1 ? "mt-4" : ""}`);
      case 12:
        return ("col-start-6" + " " + "row-start-" + `${rowStart}` + " " + `${rowStart === 1 ? "mt-4" : ""}`);
      case 13:
        return ("col-start-7" + " " + "row-start-" + `${rowStart}` + " " + `${rowStart === 1 ? "mt-4" : ""}`);
      case 14:
        return ("col-start-8" + " " + "row-start-" + `${rowStart}` + " " + `${rowStart === 1 ? "mt-4" : ""}`);
      case 15:
        return ("col-start-9" + " " + "row-start-" + `${rowStart}` + " " + `${rowStart === 1 ? "mt-4" : ""}`);
      case 16:
        return ("col-start-10" + " " + "row-start-" + `${rowStart}` + " " + `${rowStart === 1 ? "mt-4" : ""}`);
      case 17:
        return ("col-start-11" + " " + "row-start-" + `${rowStart}` + " " + `${rowStart === 1 ? "mt-4" : ""}`);

      default:
        break;
    }
  };

  return (
    entries.map((e, i) => (
      <div
        key={i}
        className={`
            rounded-lg self-center border px-2 py-1.5 text-xs leading-tight h-min z-5
            ${getLevelColor(`${e.course.level}`)} ${spanClass(e.time_slot.duration)} ${columnPositioning(e.time_slot.start_hour)} 
          `}
      >
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <p className="font-mono font-medium truncate">{e.course.code}</p>
            <p className="opacity-70 truncate mt-0.5">{e.hall.name}</p>
            <p className="opacity-60 truncate">{e.lecturer.first_name + " " + e.lecturer.last_name}</p>
          </div>
          {e.time_slot.duration >= 2 && (<div className="h-min">
            <p>{e.time_slot.start_time_display} - {e.time_slot.end_time_display}</p>
          </div>)
          }
        </div>
      </div>
    ))
  );
}


// ── print layout ──────────────────────────────────────────────────────────────

interface PrintLayoutProps {
  entries: TimetableEntry[];
  departments: Department[];
  selectedDept: string;
  selectedLevel: string;
}
function PrintPortal({ children }: { children: React.ReactNode }) {
  const el = useRef<HTMLDivElement | null>(null);

  if (!el.current && typeof document !== "undefined") {
    el.current = document.createElement("div");
    el.current.id = "print-container";
    // ← Remove the inline style entirely — CSS handles visibility
  }

  useEffect(() => {
    const container = el.current;
    if (!container) return;
    document.body.appendChild(container);
    return () => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, []);

  if (!el.current) return null;
  return createPortal(children, el.current);
}

function PrintLayout({ entries, departments, selectedDept, selectedLevel }: PrintLayoutProps) {
  const grid: Record<string, Record<number, TimetableEntry[]>> = {};
  DAYS.forEach((day) => {
    grid[day] = {};
    GRID_SLOTS.forEach((slot) => { grid[day][slot.start] = []; });
  });
  entries.forEach((entry) => {
    const day = entry.time_slot.day;
    const start = entry.time_slot.start_hour;
    if (grid[day]?.[start] !== undefined) {
      grid[day][start].push(entry);
    }
  });

  const deptName = departments.find((d) => String(d.id) === selectedDept)?.name ?? "All Departments";
  const levelName = selectedLevel ? `${selectedLevel} Level` : "All Levels";

  const levelStyles: Record<string, { background: string; color: string; borderLeft: string }> = {
    "100": { background: "#bbf7d0", color: "#15803d", borderLeft: "3px solid #4ade80" },
    "200": { background: "#e5e7eb", color: "#374151", borderLeft: "3px solid #9ca3af" },
    "300": { background: "#fed7aa", color: "#c2410c", borderLeft: "3px solid #fb923c" },
    "400": { background: "#fee2e2", color: "#be123c", borderLeft: "3px solid #f87171" },
    "500": { background: "#f3e8ff", color: "#7e22ce", borderLeft: "3px solid #c084fc" },
  };

  // Fallback for unknown levels
  const defaultLs = { background: "#f1f5f9", color: "#475569", borderLeft: "3px solid #cbd5e1" };

  return (
    <div style={{ padding: "0.8cm", background: "white", color: "black", fontFamily: "Arial, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: "10px", paddingBottom: "8px", borderBottom: "2px solid #1e3a5f" }}>
        <h1 style={{ fontSize: "15px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", margin: 0, color: "#1e3a5f" }}>
          University Timetable Schedule
        </h1>
        <div style={{ display: "flex", gap: "20px", marginTop: "4px", fontSize: "8px", color: "#555" }}>
          <span>📅 Generated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
          <span>🏛 Department: {deptName}</span>
          <span>📚 Level: {levelName}</span>
          <span>📋 Total Sessions: {entries.length}</span>
        </div>
      </div>

      {/* One table per day — prevents blank pages from day overflow */}
      {DAYS.map((day, di) => {
        const dayEntries = entries.filter(e => e.time_slot.day === day);
        if (dayEntries.length === 0) return null;

        const maxEntries = Math.max(
          1,
          ...GRID_SLOTS.map((s) => grid[day][s.start].length)
        );

        const subRows = Array.from({ length: maxEntries }, (_, rowIdx) =>
          GRID_SLOTS.map((slot) => grid[day][slot.start][rowIdx] ?? null)
        );

        return (
          <div
            key={day}
            style={{
              marginBottom: "10px",
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >
            {/* Day heading */}
            <div style={{
              background: "#1e3a5f",
              color: "white",
              padding: "4px 8px",
              fontSize: "9px",
              fontWeight: "bold",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: "2px",
            }}>
              {day}
            </div>

            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: "8px", tableLayout: "fixed" }}
            >
              <colgroup>
                {GRID_SLOTS.map((s) => (
                  <col key={s.start} style={{ width: `${100 / GRID_SLOTS.length}%` }} />
                ))}
              </colgroup>

              {/* Time slot headers */}
              <thead>
                <tr>
                  {GRID_SLOTS.map((slot) => (
                    <th
                      key={slot.start}
                      style={{
                        border: "1px solid #cbd5e1",
                        background: "#334155",
                        color: "white",
                        padding: "3px 2px",
                        textAlign: "center",
                        fontSize: "7px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {slot.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {subRows.map((subRow, rowIdx) => {
                  const absorbedSlots = new Set<number>();
                  return (
                    <tr
                      key={rowIdx}
                      style={{
                        background: rowIdx % 2 === 0 ? "white" : "#f8faff",
                        pageBreakInside: "avoid",
                        breakInside: "avoid",
                      }}
                    >
                      {subRow.map((entry, slotIdx) => {
                        if (absorbedSlots.has(slotIdx)) return null;

                        if (entry) {
                          const span = entry.time_slot.duration;
                          for (let k = 1; k < span; k++) absorbedSlots.add(slotIdx + k);
                          const ls = levelStyles[String(entry.course.level)] ?? defaultLs;
                          return (
                            <td
                              key={slotIdx}
                              colSpan={span}
                              style={{
                                borderTop: "1px solid #e2e8f0",
                                borderRight: "1px solid #e2e8f0",
                                borderBottom: "1px solid #e2e8f0",
                                borderLeft: ls.borderLeft,          // ← level accent colour on left edge
                                padding: "3px 4px",
                                verticalAlign: "top",
                                minHeight: "45px",
                                height: "45px",
                                background: ls.background,
                                color: ls.color,
                              }}
                            >
                              <p style={{ fontWeight: "bold", fontSize: "8px", margin: "0 0 1px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {entry.course.code}
                              </p>
                              <p style={{ fontSize: "7px", margin: "0 0 1px 0", opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {entry.course.name}
                              </p>
                              <p style={{ fontSize: "7px", margin: "0 0 1px 0", opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                🏛 {entry.hall.name}
                              </p>
                              <p style={{ fontSize: "7px", margin: 0, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                👤 {entry.lecturer.first_name[0]}. {entry.lecturer.last_name}
                              </p>
                              {span > 1 && (
                                <p style={{ fontSize: "6px", margin: "2px 0 0 0", opacity: 0.5, fontStyle: "italic" }}>
                                  {entry.time_slot.start_time_display} – {entry.time_slot.end_time_display}
                                </p>
                              )}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={slotIdx}
                            style={{
                              border: "1px solid #e2e8f0",
                              padding: "3px",
                              minHeight: "45px",
                              height: "45px",
                              background: "transparent",
                            }}
                          />
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Legend */}
      <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", pageBreakInside: "avoid" }}>
        <span style={{ fontSize: "8px", fontWeight: "bold", color: "#555", marginRight: "4px" }}>LEVEL:</span>
        {Object.entries(levelStyles).map(([level, ls]) => (
          <span key={level} style={{
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "8px",
            fontWeight: "bold",
            background: ls.background,
            color: ls.color,
            border: `1px solid ${ls.borderLeft.replace("2px solid ", "")}`,
          }}>
            {level} Level
          </span>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: "7px", color: "#aaa" }}>
        <span>Automated Timetable Generation System</span>
        <span>Printed: {new Date().toLocaleString("en-GB")}</span>
      </div>
    </div>
  );
}


export default function TimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [unscheduled, setUnscheduled] = useState<UnscheduledItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  const [stats, setStats] = useState<Stats>({
    courses: 0, halls: 0,
  });

  useEffect(() => {
    Promise.all([
      courseApi.getAll(),
      hallApi.getAll(),
    ]).then(([courses, halls]) => {
      setStats({
        courses: courses.length,
        halls: halls.length,
      });
    }).catch(err => {
      console.error(err);
    });
  }, []);

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    timetableApi.view()
      .then(data => {
        // Apply frontend filters
        let filtered = data;
        if (selectedDept) {
          filtered = filtered.filter((e) =>
            String(typeof e.course.department === 'object' ? e.course.department?.id : e.course.department) === selectedDept ||
            (e.course.course_type === 'shared' && e.course.shared_departments?.some(d => (typeof d === 'object' ? d.id : d) === Number(selectedDept))) ||
            e.course.course_type === 'general'
          );
        }
        if (selectedLevel) {
          filtered = filtered.filter((e) => String(e.course.level) === selectedLevel);
        }
        setEntries(filtered);
        setHasData(filtered.length > 0);
      })
      .catch((err) => {
        if (!(err instanceof ApiError) || err.status >= 500) {
          console.error(err);
        }
        setToast({ message: err.message || "Failed to load timetable.", type: "error" });
      })
      .finally(() => setLoading(false));
  }, [selectedDept, selectedLevel]);

  useEffect(() => {
    departmentApi.getAll().then(setDepartments).catch((err) => {
      if (!(err instanceof ApiError) || err.status >= 500) {
        console.error(err);
      }
    });
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const generate = () => {
    setLoading(true);
    timetableApi.generate()
      .then((res) => {
        setUnscheduled(res.unscheduled || []);
        setToast({ message: res.message || "Timetable generated successfully.", type: "success" });
        load();
      })
      .catch((err) => {
        if (!(err instanceof ApiError) || err.status >= 500) {
          console.error(err);
        }
        setToast({ message: err.message || "Failed to generate timetable.", type: "error" });
      })
      .finally(() => setLoading(false));
  };

  const handlePrint = () => {
    window.print();
  };

  const grid: Record<string, Record<number, TimetableEntry[]>> = {};
  DAYS.forEach(day => {
    grid[day] = {};
    GRID_SLOTS.forEach(slot => {
      grid[day][slot.start] = [];
    });
  });

  entries.forEach(entry => {
    const day = entry.time_slot.day;
    const start = entry.time_slot.start_hour;
    if (grid[day] && grid[day][start]) {
      grid[day][start].push(entry);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-black/60 tracking-tight">
            Timetable
          </h1>
          <p className="text-sm text-black/60 mt-1">
            {selectedDept || selectedLevel ? "Filtered View" : "Full Schedule Overview"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 no-print">
          <div className="flex items-center gap-2 bg-blue-900 p-2 rounded-xl border border-blue-800">
            <div className="flex items-center gap-1.5 px-2 text-white/80">
              <Filter size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Filter</span>
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className={selectCls}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.code}</option>
              ))}
            </select>

            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className={selectCls}
            >
              <option value="">All Levels</option>
              {LEVELS.map(l => (
                <option key={l} value={l}>{l}L</option>
              ))}
            </select>
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm
              font-medium bg-blue-500 hover:bg-blue-400 disabled:opacity-50
              text-white transition-all shadow-md shadow-blue-600/20 active:scale-95 no-print
            "
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Generating..." : "Generate"}
          </button>

          <button
            onClick={handlePrint}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm
              font-medium bg-white border border-blue-400 hover:ring-4 hover:ring-blue-400/70 hover:bg-blue-500 hover:text-white
              text-blue-400 transition-all active:scale-95 no-print
            "
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-pulse">
          <RefreshCw size={32} className="text-blue-500 animate-spin mb-4" />
          <p className="text-black/40 font-medium">Updating timetable...</p>
        </div>
      )}


      {/* Empty state */}
      {!hasData && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-4 rounded-2xl bg-blue-400/30 mb-4">
            <CalendarDays size={28} className="text-blue-500" />
          </div>
          <p className="text-black/60 font-medium">
            No timetable generated yet
          </p>
          <p className="text-blue-400 text-sm mt-1 mb-6">
            Add your courses, lecturers, and halls first, then click Generate.
          </p>
          {!selectedDept && !selectedLevel && (
            <button onClick={generate} className="px-6 py-2 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-400 transition-all">
              Generate Automatically
            </button>
          )}
        </div>
      )}

      {/* Stats strip */}
      {hasData && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
          {[
            {
              label: "Scheduled",
              value: `${entries.length}`,
              color: "text-emerald-400",
            },
            {
              label: "Unscheduled",
              value: `${unscheduled.length}`,
              color: "text-rose-400",
            },
            {
              label: "Days used",
              value: `${[...new Set(entries.map((e) => e.time_slot.day))].length}`,
              color: "text-indigo-400",
            },
            {
              label: "Halls used",
              value: `${[...new Set(entries.map((e) => e.hall.name))].length}`,
              color: "text-amber-400",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="p-4 rounded-xl bg-blue-900 border border-blue-800"
            >
              <p className={`font-mono text-2xl font-medium ${color}`}>
                {value}
              </p>
              <p className="text-xs text-white/60 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {unscheduled.length > 0 && !loading && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-sm no-print">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-700">
              {unscheduled.length} session(s) unscheduled
            </p>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
              {unscheduled.map((u, i) => (
                <p key={i} className="text-[11px] text-amber-800/80 italic">
                  • <span className="font-bold non-italic">{u.course}</span>: {u.reason}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {hasData && !loading && (
        <div className="flex flex-wrap gap-2 items-center no-print">
          <span className="text-xs text-slate-500 font-mono mr-1">Level:</span>
          {Object.entries(LEVEL_COLORS).map(([level, cls]) => (
            <span
              key={level}
              className={`px-2 py-0.5 rounded-md text-xs border font-mono ${cls}`}
            >
              {level}
            </span>
          ))}
        </div>
      )}
      {hasData && !loading && (
        <div className="hidden md:block rounded-xl border border-black/60 overflow-hidden no-print">
          <div className="overflow-x-auto">
            <div className={`text-sm`} style={{
              width: `${GRID_SLOTS.length * 200 + 130}px`,
            }}>
              {/* HEADER */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `130px repeat(${TIME_SLOTS.length}, minmax(calc(130px - 10rem), 1fr))`,
                }}
              >
                {/* Top-left */}
                <div className="px-4 py-3 font-mono text-xs text-white/80 bg-blue-900 sticky left-0 z-20">
                  Day / Time
                </div>

                {TIME_SLOTS.map((slot) => (
                  <div
                    key={slot}
                    className="px-3 py-3 text-center font-mono text-xs text-white/90 font-medium whitespace-nowrap bg-blue-400/70 border-b border-black/60"
                  >
                    {slot}
                  </div>
                ))}
              </div>

              {/* BODY */}
              {DAYS.map((day, di) => {

                let maxCount = 0;

                for (const slot of GRID_SLOTS) {
                  const entries = grid[day]?.[slot.start] ?? [];

                  if (entries.length > maxCount) {
                    maxCount = entries.length;
                  }
                }
                return (
                  <div
                    key={day}
                    className={`grid pr-4 grid-flow-col gap-x-4 gap-y-2 border-b border-blue-400 ${di % 2 === 0 ? "" : "bg-blue-100/30"}`}
                    style={{
                      gridTemplateColumns: `130px repeat(${GRID_SLOTS.length}, minmax(calc(130px - 10rem), 1fr))`, gridTemplateRows: `repeat(${maxCount}, minmax(61px, 1fr))`,
                    }}
                  >
                    {/* Day Label */}
                    <div className="px-4 py-3 row-span-full font-mono text-xs font-medium text-white/80 bg-blue-500 sticky left-0 z-10 border-r border-blue-400">
                      {day}
                    </div>

                    {/* Slots */}
                    {GRID_SLOTS.map((slot) => (
                      <TimetableCell key={slot.label} entries={grid[day]?.[slot.start] ?? []} />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── mobile card view ── */}
      {hasData && !loading && (
        <div className="md:hidden space-y-4 no-print">
          {DAYS.map((day) => {
            const dayEntries = entries.filter(
              (e) => e.time_slot.day === day
            );

            if (dayEntries.length === 0) return null;

            return (
              <div key={day} className="rounded-xl border border-blue-800 overflow-hidden">
                <div className="px-4 py-3 bg-blue-900 border-b border-blue-800 flex items-center justify-between">
                  <h3 className="font-medium text-white/80 text-sm">{day}</h3>
                  <span className="font-mono text-xs text-white/80">
                    {dayEntries.length} class{dayEntries.length !== 1 ? "es" : ""}
                  </span>
                </div>

                <div className="divide-y divide-blue-900">
                  {dayEntries
                    .sort(
                      (a, b) =>
                        a.time_slot.start_hour - b.time_slot.start_hour
                    )
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="px-4 py-3 flex items-start gap-5"
                      >
                        {/* Time */}
                        <div className="flex items-center gap-1.5 text-black/50 shrink-0 pt-0.5">
                          <Clock size={12} />
                          <span className="font-mono text-xs whitespace-nowrap flex flex-col">
                            <p>{entry.time_slot.start_time_display}</p>
                            <p>{entry.time_slot.end_time_display}</p>
                          </span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-medium text-sm text-blue-900">
                              {entry.course?.name}
                            </span>

                            <span
                              className={`px-1.5 py-0.5 rounded text-xs border font-mono ${getLevelColor(
                                `${entry.course?.level}`
                              )}`}
                            >
                              {entry.course?.level}L
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mt-0.5 gap-1 flex">
                            <span className="text-blue-500">Lecturer:</span>
                            {entry.lecturer.first_name + " " + entry.lecturer.last_name}
                          </p>

                          <p className="text-xs text-slate-500 gap-1 flex">
                            <span className="text-blue-500">Hall:</span>
                            {entry.hall?.name}
                          </p>
                        </div>

                        {/* Duration */}
                        <div className="font-mono text-xs text-slate-600 shrink-0">
                          {entry.time_slot.duration}h
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── print layout (hidden on screen, visible on print) ── */}
      <PrintPortal>
        <PrintLayout
          entries={entries}
          departments={departments}
          selectedDept={selectedDept}
          selectedLevel={selectedLevel}
        />
      </PrintPortal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
