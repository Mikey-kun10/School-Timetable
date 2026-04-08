"use client";

import { useEffect, useState } from "react";
import { BookOpen, Users, Building2, GraduationCap } from "lucide-react";
import Link from "next/link";
import { departmentApi, lecturerApi, hallApi, courseApi } from "@/lib/api";

interface Stats {
  courses: number;
  lecturers: number;
  halls: number;
  departments: number;
}

const CARDS = [
  {
    label: "Departments",
    key: "departments" as keyof Stats,
    icon: Building2,
    href: "/dashboard/departments",
    color: "text-indigo-300",
    bg: "bg-indigo-500/30",
  },
  {
    label: "Lecturers",
    key: "lecturers" as keyof Stats,
    icon: Users,
    href: "/dashboard/lecturers",
    color: "text-emerald-400",
    bg: "bg-emerald-500/30",
  },
  {
    label: "Halls",
    key: "halls" as keyof Stats,
    icon: GraduationCap,
    href: "/dashboard/halls",
    color: "text-amber-400",
    bg: "bg-amber-500/30",
  },
  {
    label: "Courses",
    key: "courses" as keyof Stats,
    icon: BookOpen,
    href: "/dashboard/courses",
    color: "text-rose-400",
    bg: "bg-rose-500/30",
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    courses: 0, lecturers: 0, halls: 0, departments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      courseApi.getAll(),
      lecturerApi.getAll(),
      hallApi.getAll(),
      departmentApi.getAll()
    ]).then(([courses, lecturers, halls, departments]) => {
      setStats({
        courses: courses.length,
        lecturers: lecturers.length,
        halls: halls.length,
        departments: departments.length,
      });
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-black/60 tracking-tight">Overview</h1>
        <p className="text-sm text-black/60 mt-1">
          Manage your timetable data from here.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map(({ label, key, icon: Icon, href, color, bg }) => (
          <Link
            key={key}
            href={href}
            className="
              group flex flex-col gap-4 p-5 rounded-xl
              bg-blue-900 border border-blue-800 shadow-md
              hover:shadow-xl hover:bg-blue-800 transition-all duration-200
            "
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">{label}</span>
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon size={16} className={color} />
              </div>
            </div>
            <div className="font-mono text-3xl font-medium text-white/80">
              {loading ? (
                <div className="h-8 w-16 bg-slate-800 rounded animate-pulse" />
              ) : (
                stats[key]
              )}
            </div>
            <p className="text-xs text-white/80 group-hover:text-white transition-colors">
              View all →
            </p>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-black/60 uppercase tracking-wider font-mono mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/dashboard/timetable"
            className="
              flex items-center gap-3 p-4 rounded-xl
              bg-green-600/10 border border-green-500/20
              hover:bg-green-600/20 hover:border-green-500/40
              transition-all duration-200 group
            "
          >
            <div className="p-2 rounded-lg bg-green-500/20">
              <BookOpen size={16} className="text-black/60" />
            </div>
            <div>
              <p className="text-sm font-medium text-black/60">Generate Timetable</p>
              <p className="text-xs text-black/60">Run the scheduling algorithm</p>
            </div>
            <span className="ml-auto text-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </span>
          </Link>

          <Link
            href="/dashboard/courses"
            className="
              flex items-center gap-3 p-4 rounded-xl
              bg-yellow-300/50 border border-yellow-300
              hover:border-yellow-400 hover:bg-yellow-300/65 transition-all duration-200 group
            "
          >
            <div className="p-2 rounded-lg bg-yellow-300">
              <BookOpen size={16} className="text-black/60" />
            </div>
            <div>
              <p className="text-sm font-medium text-black/60">Add a Course</p>
              <p className="text-xs text-black/60">Register a new course</p>
            </div>
            <span className="ml-auto text-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}