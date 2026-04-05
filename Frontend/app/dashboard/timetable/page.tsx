"use client";

import { useState, useCallback } from "react";
import { CalendarDays, RefreshCw, AlertTriangle, Clock } from "lucide-react";
import { courseStore, lecturerStore, hallStore } from "@/lib/store";
import { DAYS, TIME_SLOTS } from "@/lib/types";
import type { Course, Lecturer, Hall } from "@/lib/types";

// ── types ─────────────────────────────────────────────────────────────────────

interface TimetableEntry {
  course: string;
  day: string;
  time: string[];
  hall: string;
  lecturer: string;
  level: string;
  departments: string[];
}

interface UsedLevelEntry {
  level: string;
  departments: string[];
}

// ── algorithm ─────────────────────────────────────────────────────────────────

function generateTimetable(
  courses: Course[],
  lecturers: Lecturer[],
  halls: Hall[],
): { timetable: TimetableEntry[]; unscheduled: string[] } {
  const timetable: TimetableEntry[] = [];
  const unscheduled: string[] = [];
  const usedHalls: Record<string, Record<string, string[]>> = {};
  const usedDepartments: Record<string, Record<string, string[]>> = {};
  const usedLecturers: Record<string, Record<string, string[]>> = {};
  const usedLevels: Record<string, Record<string, UsedLevelEntry[]>> = {};
  const slotLoad: Record<string, Record<string, number>> = {};

  // ── helpers ────────────────────────────────────────────────────────────────

  function getLecturer(id: string): Lecturer | undefined {
    return lecturers.find((l) => l.id === id);
  }

  function findHall(studentCount: number, day: string, slot: string): Hall | null {
    const taken = usedHalls[day]?.[slot] ?? [];
    return (
      halls
        .filter((h) => h.capacity >= studentCount && !taken.includes(h.name))
        .sort((a, b) => a.capacity - b.capacity)[0] ?? null
    );
  }

  function initSlot(
    map: Record<string, Record<string, unknown[]>>,
    day: string,
    slot: string,
  ) {
    if (!map[day]) map[day] = {};
    if (!map[day][slot]) map[day][slot] = [];
  }

  function incrementSlotLoad(day: string, slot: string) {
    if (!slotLoad[day]) slotLoad[day] = {};
    if (!slotLoad[day][slot]) slotLoad[day][slot] = 0;
    slotLoad[day][slot]++;
  }

  function getSlotLoad(day: string, slot: string): number {
    return slotLoad[day]?.[slot] ?? 0;
  }

  function departmentsOverlap(courseDepts: string[], existingDepts: string[]): boolean {
    if (courseDepts.includes("ALL") || existingDepts.includes("ALL")) return true;
    return courseDepts.some((d) => existingDepts.includes(d));
  }

  function scoreCandidate(day: string, slotIndex: number, duration: number): number {
    let peakSlotLoad = 0;
    let totalSlotLoad = 0;

    for (let j = 0; j < duration; j++) {
      const load = getSlotLoad(day, TIME_SLOTS[slotIndex + j]);
      peakSlotLoad = Math.max(peakSlotLoad, load);
      totalSlotLoad += load;
    }

    const dayLoad = timetable.filter((e) => e.day === day).length;

    return peakSlotLoad * 1000
      + totalSlotLoad * 100
      + dayLoad * 10
      + slotIndex;
  }

  function constraintScore(course: Course): number {
    const lecturer = getLecturer(course.lecturerId);
    const availDays = lecturer ? lecturer.availableDays.length : 0;
    const deptWeight = course.departments.includes("ALL") ? 10 : 0;
    return course.duration * 3 + (5 - availDays) + deptWeight;
  }

  // ── sort hardest-to-place first ────────────────────────────────────────────

  const sortedCourses = [...courses].sort(
    (a, b) => constraintScore(b) - constraintScore(a),
  );

  // ── main scheduling loop ───────────────────────────────────────────────────

  for (const course of sortedCourses) {
    const lecturer = getLecturer(course.lecturerId);

    if (!lecturer) {
      unscheduled.push(course.courseCode);
      continue;
    }

    const courseDepts = course.departments.includes("ALL")
      ? ["ALL"]
      : course.departments;

    // student count comes from the department's studentCount if available,
    // otherwise default to 30 so findHall always has something to work with
    const studentCount = 30;

    const candidates: {
      day: string; slotIndex: number; hall: Hall; score: number;
    }[] = [];

    for (const day of DAYS) {
      if (!lecturer.availableDays.includes(day)) continue;

      for (let i = 0; i <= TIME_SLOTS.length - course.duration; i++) {
        let canFit = true;

        for (let j = 0; j < course.duration; j++) {
          const slot = TIME_SLOTS[i + j];

          // Lecturer clash
          if (usedLecturers[day]?.[slot]?.includes(lecturer.name)) {
            canFit = false; break;
          }

          // Department clash
          const slotDepts = usedDepartments[day]?.[slot] ?? [];
          if (slotDepts.length && departmentsOverlap(courseDepts, slotDepts)) {
            canFit = false; break;
          }

          // Level clash within same department
          const slotLevels = usedLevels[day]?.[slot] ?? [];
          const hasLevelClash = slotLevels.some(
            (entry) =>
              entry.level === course.level &&
              departmentsOverlap(courseDepts, entry.departments),
          );
          if (hasLevelClash) { canFit = false; break; }
        }

        if (!canFit) continue;

        const hall = findHall(studentCount, day, TIME_SLOTS[i]);
        if (!hall) continue;

        candidates.push({
          day,
          slotIndex: i,
          hall,
          score: scoreCandidate(day, i, course.duration),
        });
      }
    }

    if (candidates.length === 0) {
      unscheduled.push(course.courseCode);
      continue;
    }

    // Pick the best-scored candidate
    const best = candidates.reduce((a, b) => (a.score <= b.score ? a : b));
    const { day, slotIndex, hall } = best;

    timetable.push({
      course: course.courseCode,
      day,
      time: TIME_SLOTS.slice(slotIndex, slotIndex + course.duration),
      hall: hall.name,
      lecturer: lecturer.name,
      level: course.level,
      departments: courseDepts,
    });

    // Mark usage for every occupied slot
    for (let j = 0; j < course.duration; j++) {
      const slot = TIME_SLOTS[slotIndex + j];

      initSlot(usedHalls as never, day, slot);
      initSlot(usedLecturers as never, day, slot);
      initSlot(usedDepartments as never, day, slot);
      initSlot(usedLevels as never, day, slot);

      usedHalls[day][slot].push(hall.name);
      usedLecturers[day][slot].push(lecturer.name);
      usedLevels[day][slot].push({ level: course.level, departments: courseDepts });
      usedDepartments[day][slot].push(...courseDepts);
      incrementSlotLoad(day, slot);
    }
  }

  return { timetable, unscheduled };
}

// ── build display grid ────────────────────────────────────────────────────────

function buildGrid(
  timetable: TimetableEntry[],
): Record<string, Record<string, TimetableEntry[]>> {
  const grid: Record<string, Record<string, TimetableEntry[]>> = {};

  for (const day of DAYS) {
    grid[day] = {};
    for (const slot of TIME_SLOTS) {
      grid[day][slot] = [];
    }
  }

  for (const entry of timetable) {
    for (const slot of entry.time) {
      // Only push on the first slot to avoid duplicating multi-hour courses
      if (slot === entry.time[0]) {
        grid[entry.day][slot].push(entry);
      }
    }
  }

  return grid;
}

// ── level colours ─────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  "100": "bg-green-600/35 border-green-600/30 text-green-600",
  "200": "bg-black/15 border-black/30 text-black/70",
  "300": "bg-orange-700/15 border-orange-700/30 text-orange-600",
  "400": "bg-rose-500/15 border-rose-500/30 text-rose-400",
  "500": "bg-purple-600/15 border-purple-600/30 text-purple-400",
};

function getLevelColor(level: string): string {
  return LEVEL_COLORS[level] ?? "bg-slate-700/40 border-slate-600 text-slate-300";
}

// ── timetable cell ────────────────────────────────────────────────────────────

function TimetableCell({ entries }: { entries: TimetableEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 p-1">
      {entries.map((e, i) => (
        <div
          key={i}
          className={`
            rounded-lg border px-2 py-1.5 text-xs leading-tight
            ${getLevelColor(e.level)} ${e.time.length === 2 ? "w-[217%]" : e.time.length === 3 ? "w-[334%]" : "w-full"}
          `}
        >
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <p className="font-mono font-medium truncate">{e.course}</p>
              <p className="opacity-70 truncate mt-0.5">{e.hall}</p>
              <p className="opacity-60 truncate">{e.time.length >= 2 ? e.lecturer : e.lecturer.split(" ").pop()}</p>
            </div>
            {e.time.length >= 2 && (<div className="h-min">
              {e.time.map((time, index) => (<p key={index}>{time}</p>))}
            </div>)
            }
          </div>
        </div>
      ))}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [unscheduled, setUnscheduled] = useState<string[]>([]);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(() => {
    setLoading(true);

    // Small timeout so the loading spinner renders before the sync work runs
    setTimeout(() => {
      const courses = courseStore.getAll();
      const lecturers = lecturerStore.getAll();
      const halls = hallStore.getAll();

      const { timetable: tt, unscheduled: un } =
        generateTimetable(courses, lecturers, halls);

      setTimetable(tt);
      setUnscheduled(un);
      setGenerated(true);
      setLoading(false);
    }, 300);
  }, []);

  const grid = buildGrid(timetable);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-black/60 tracking-tight">
            Timetable
          </h1>
          <p className="text-sm text-black/60 mt-1">
            Auto-generate a conflict-free weekly schedule.
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="
            sm:ml-auto flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm
            font-medium bg-blue-500 hover:bg-blue-400 disabled:opacity-50
            text-white transition-colors
          "
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading
            ? "Generating…"
            : generated
              ? "Regenerate"
              : "Generate Timetable"}
        </button>
      </div>

      {/* Unscheduled warning */}
      {unscheduled.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/20 border border-amber-500/30">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-400">
              {unscheduled.length} course{unscheduled.length !== 1 ? "s" : ""}{" "}
              could not be scheduled
            </p>
            <p className="text-xs text-amber-400/90 mt-1">
              {unscheduled.join(", ")}
            </p>
            <p className="text-xs text-amber-400/80 mt-1">
              Check that halls, lecturers, and available days are configured
              correctly.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!generated && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-4 rounded-2xl bg-blue-400/30 mb-4">
            <CalendarDays size={28} className="text-blue-500" />
          </div>
          <p className="text-black/60 font-medium">
            No timetable generated yet
          </p>
          <p className="text-blue-400 text-sm mt-1">
            Add your courses, lecturers, and halls first, then click Generate.
          </p>
        </div>
      )}

      {/* Stats strip */}
      {generated && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Scheduled",
              value: timetable.length,
              color: "text-emerald-400",
            },
            {
              label: "Unscheduled",
              value: unscheduled.length,
              color: "text-rose-400",
            },
            {
              label: "Days used",
              value: [...new Set(timetable.map((e) => e.day))].length,
              color: "text-indigo-400",
            },
            {
              label: "Halls used",
              value: [...new Set(timetable.map((e) => e.hall))].length,
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

      {/* Legend */}
      {generated && (
        <div className="flex flex-wrap gap-2 items-center">
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

      {/* ── desktop grid ── */}
      {generated && (
        <div className="hidden md:block rounded-xl border border-black/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-blue-400/70 border-b border-black/60">
                  {/* Top-left corner cell */}
                  <th className="px-4 py-3 text-left font-mono text-xs text-white/80 w-28 whitespace-nowrap sticky left-0 bg-blue-900">
                    Day / Time
                  </th>
                  {TIME_SLOTS.map((slot) => (
                    <th
                      key={slot}
                      className="px-3 py-3 text-left font-mono text-xs text-white/90 font-medium whitespace-nowrap min-w-[160px]"
                    >
                      {slot}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, di) => (
                  <tr
                    key={day}
                    className={`border-b border-blue-400 ${di % 2 === 0 ? "" : "bg-blue-100/30"}`}
                  >
                    {/* Day label — sticky so it stays visible when scrolling horizontally */}
                    <td className="px-4 py-3 font-mono text-xs font-medium text-white/80 whitespace-nowrap align-middle sticky left-0 bg-blue-500 border-r border-blue-400 z-10">
                      {day}
                    </td>
                    {TIME_SLOTS.map((slot) => (
                      <td key={slot} className="px-2 py-2 align-top">
                        <TimetableCell entries={grid[day]?.[slot] ?? []} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── mobile card view ── */}
      {generated && (
        <div className="md:hidden space-y-4">
          {DAYS.map((day) => {
            const dayEntries = timetable.filter((e) => e.day === day);
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
                    .sort((a, b) => a.time[0].localeCompare(b.time[0]))
                    .map((entry, i) => (
                      <div key={i} className="px-4 py-3 flex items-start gap-5">
                        <div className="flex items-center gap-1.5 text-black/50 shrink-0 pt-0.5">
                          <Clock size={12} />
                          <span className="font-mono text-xs whitespace-nowrap flex flex-col">
                            {entry.time.map((time, index) => (<p key={index}>{time}</p>))}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-medium text-sm text-blue-900">
                              {entry.course}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-xs border font-mono ${getLevelColor(entry.level)}`}>
                              {entry.level}L
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 gap-1 flex"><span className="text-blue-500">Lecturer:</span>{entry.lecturer}</p>
                          <p className="text-xs text-slate-500 gap-1 flex"><span className="text-blue-500"> Hall:</span>{entry.hall}</p>
                        </div>
                        <div className="font-mono text-xs text-slate-600 shrink-0">
                          {entry.time.length}h
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
