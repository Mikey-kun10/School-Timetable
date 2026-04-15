"use client";

import { useState, useCallback, useEffect } from "react";
import { CalendarDays, RefreshCw, AlertTriangle, Clock, Filter, Printer } from "lucide-react";
import { timetableApi, departmentApi, ApiError } from "@/lib/api";
import { DAYS, LEVELS, Department, TimetableEntry } from "@/lib/types";
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

const LEVEL_COLORS: Record<string, string> = {
  "100": "bg-emerald-50 border-emerald-200 text-emerald-700",
  "200": "bg-blue-50 border-blue-200 text-blue-700",
  "300": "bg-amber-50 border-amber-200 text-amber-700",
  "400": "bg-rose-50 border-rose-200 text-rose-700",
  "500": "bg-indigo-50 border-indigo-200 text-indigo-700",
};

function getLevelColor(level: number | string): string {
  return LEVEL_COLORS[String(level)] ?? "bg-slate-50 border-slate-200 text-slate-600";
}

const selectCls = `
  px-3 py-1.5 text-xs rounded-lg bg-white border border-black/20
  text-black/60 focus:outline-none focus:border-blue-400 focus:ring-2
  focus:ring-blue-400/20 transition-all cursor-pointer
`;

export default function TimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [unscheduled, setUnscheduled] = useState<UnscheduledItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

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
      {/* Print-only Header */}
      <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-bold uppercase tracking-tighter">
          University Timetable Schedule
        </h1>
        <div className="flex gap-4 mt-2 text-sm font-mono">
          <p>Generated: {new Date().toLocaleDateString()}</p>
          {selectedDept && (
            <p>Department: {departments.find(d => String(d.id) === selectedDept)?.name}</p>
          )}
          {selectedLevel && (
            <p>Level: {selectedLevel}L</p>
          )}
        </div>
      </div>
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
          <div className="flex items-center gap-2 bg-black/5 p-1.5 rounded-xl border border-black/5">
            <div className="flex items-center gap-1.5 px-2 text-black/40">
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
              font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50
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
              font-medium bg-white border border-black/10 hover:bg-black/5
              text-black/60 transition-all active:scale-95 no-print
            "
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {unscheduled.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-sm">
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

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-pulse">
            <RefreshCw size={32} className="text-blue-500 animate-spin mb-4" />
            <p className="text-black/40 font-medium">Updating timetable...</p>
        </div>
      )}

      {!hasData && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-black/5 rounded-3xl border border-dashed border-black/10">
          <div className="p-4 rounded-2xl bg-white shadow-sm mb-4">
            <CalendarDays size={28} className="text-blue-500" />
          </div>
          <p className="text-black/60 font-semibold text-lg">Empty Schedule</p>
          <p className="text-black/40 text-sm mt-1 mb-6 max-w-xs">
            {selectedDept || selectedLevel 
              ? "No courses match the selected filters." 
              : "No timetable data found in the database. Add courses and lecturers first."}
          </p>
          {!selectedDept && !selectedLevel && (
            <button onClick={generate} className="px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-all">
                Generate Automatically
            </button>
          )}
        </div>
      )}

      {hasData && !loading && (
        <div className="rounded-2xl border border-black/10 overflow-hidden shadow-xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-900 border-b border-black/10">
                  <th className="px-4 py-4 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 w-24 sticky left-0 bg-slate-900 z-30">
                    Day
                  </th>
                  {GRID_SLOTS.map((slot) => (
                    <th key={slot.start} className="px-3 py-4 text-left font-mono text-[10px] uppercase tracking-widest text-white/70 font-bold whitespace-nowrap min-w-[180px]">
                      {slot.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {DAYS.map((day) => (
                  <tr key={day} className={`group hover:bg-blue-50/30 transition-colors`}>
                    <td className="px-4 py-6 font-mono text-[11px] font-black text-slate-400 whitespace-nowrap align-middle sticky left-0 bg-white group-hover:bg-blue-50/30 border-r border-black/5 z-20 transition-colors uppercase">
                      {day.slice(0, 3)}
                    </td>
                    {GRID_SLOTS.map((slot) => {
                       const cellEntries = grid[day][slot.start];
                       return (
                         <td key={slot.start} className="px-2 py-2 align-top h-32 relative border-r border-black/5 group-hover:border-blue-400/10 transition-colors">
                           <div className="flex flex-col gap-2 h-full">
                            {cellEntries.map((e, ei) => {
                                const duration = e.time_slot.end_hour - e.time_slot.start_hour;
                                return (
                                <div
                                    key={ei}
                                    className={`
                                    rounded-xl border shadow-sm px-3 py-2.5 transition-all hover:shadow-md hover:scale-[1.02]
                                    ${getLevelColor(e.course.level)} relative z-10
                                    `}
                                    style={duration > 1 && !selectedDept && !selectedLevel ? { 
                                        width: `calc(${duration * 100}% + ${(duration - 1) * 16}px)`,
                                        position: 'absolute',
                                        top: `${ei * 80 + 8}px`,
                                        left: '8px'
                                    } : {}}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="font-mono font-black text-xs leading-none tracking-tighter uppercase">{e.course.code}</span>
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-black/5 uppercase opacity-60">
                                            {duration}h
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30 shrink-0"></div>
                                            <p className="font-bold text-[10px] truncate leading-none">{e.hall.name}</p>
                                        </div>
                                        <p className="text-[9px] font-medium opacity-60 truncate uppercase tracking-tight flex items-center gap-1">
                                            <Clock size={8} />
                                            {e.lecturer.first_name.charAt(0)}. {e.lecturer.last_name}
                                        </p>
                                    </div>
                                </div>
                                );
                            })}
                           </div>
                         </td>
                       );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
