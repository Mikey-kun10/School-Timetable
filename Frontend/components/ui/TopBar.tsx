"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

const TITLES: Record<string, string> = {
  "/dashboard":             "Overview",
  "/dashboard/departments": "Departments",
  "/dashboard/lecturers":   "Lecturers",
  "/dashboard/halls":       "Halls",
  "/dashboard/courses":     "Courses",
  "/dashboard/timetable":   "Timetable",
};

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Dashboard";

  return (
    <header className="flex items-center gap-4 px-4 md:px-6 lg:px-8 h-14 border-b border-blue-400 bg-white shrink-0 no-print">
      <button
        onClick={onMenuClick}
        className="lg:hidden rounded-[50%] h-9 w-9 flex items-center justify-center leading-none text-blue-500 hover:bg-blue-400/10  transition-colors"
      >
        <Menu size={20} />
      </button>
      <h2 className="text-sm font-semibold text-blue-500 tracking-tight">{title}</h2>
      <div className="ml-auto font-mono text-xs text-blue-300">
        {new Date().toLocaleDateString("en-GB", {
          weekday: "short", day: "numeric", month: "short",
        })}
      </div>
    </header>
  );
}