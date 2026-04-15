"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, Users, Building2, LayoutGrid,
  CalendarDays, GraduationCap, X,
} from "lucide-react";

const NAV = [
  { href: "/dashboard",             label: "Overview",    icon: LayoutGrid    },
  { href: "/dashboard/colleges",    label: "Colleges",    icon: Building2     },
  { href: "/dashboard/departments", label: "Departments", icon: Building2     },
  { href: "/dashboard/lecturers",   label: "Lecturers",   icon: Users         },
  { href: "/dashboard/halls",       label: "Halls",       icon: GraduationCap },
  { href: "/dashboard/courses",     label: "Courses",     icon: BookOpen      },
  { href: "/dashboard/timetable",   label: "Timetable",   icon: CalendarDays  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 flex w-64 flex-col
        bg-blue-500 border-r border-blue-400
        transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto no-print
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-blue-400">
        <div>
          {/* <p className="font-mono text-xs text-indigo-800 tracking-widest uppercase mb-0.5">
            System
          </p> */}
          <h1 className="text-base font-semibold text-white tracking-tight">
            Timetable
          </h1>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-white h-9 w-9 flex items-center justify-center rounded-[50%] hover:bg-white/20 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === href
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                transition-all duration-150 group
                ${active
                  ? "bg-blue-100/25 text-white/90 font-medium"
                  : "text-white/50 hover:text-white/90 hover:bg-blue-100/25"
                }
              `}
            >
              <Icon
                size={16}
                className={active ? "text-white/90" : "text-white/50 group-hover:text-white/90"}
              />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/90" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-blue-400">
        <p className="font-mono text-xs text-white/50">v1.0.0</p>
      </div>
    </aside>
  );
}