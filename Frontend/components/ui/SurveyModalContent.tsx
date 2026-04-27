"use client";

import { useState } from "react";
import Link from "next/link";

export default function SurveyModalContent() {
  const [form, setForm] = useState({
    role: "",
    satisfaction: "",
  });

  const GOOGLE_FORM_LINK = "https://docs.google.com/forms/d/e/1FAIpQLSd_ltoaUYhU1BmD3c48KqOQPy8zkRP1za4A-WgutB3uojh1cw/viewform?usp=header";

  const isValid =
    form.role && form.satisfaction;

  const selectCls = `
  w-full px-3 py-2 text-sm rounded-lg bg-white border border-black/60
  text-black/60 focus:outline-none focus:border-blue-400 focus:ring-4
   focus:ring-blue-400/30 transition-all
`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-black/60">
        Help us improve your timetable experience. This takes less than 30 seconds.
      </p>

      {/* Role */}
      <div>
        <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">Your Role</label>
        <select
          className={selectCls}
          value={form.role}
          onChange={(e) =>
            setForm({ ...form, role: e.target.value })
          }
        >
          <option value="">Select</option>
          <option value="student">Student</option>
          <option value="lecturer">Lecturer</option>
          <option value="admin">Administrator</option>
        </select>
      </div>

      {/* Satisfaction */}
      <div>
        <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
          How satisfied are you?
        </label>
        <select
          className={selectCls}
          value={form.satisfaction}
          onChange={(e) =>
            setForm({ ...form, satisfaction: e.target.value })
          }
        >
          <option value="">Select</option>
          <option value="very_satisfied">Very satisfied</option>
          <option value="neutral">Neutral</option>
          <option value="unsatisfied">Unsatisfied</option>
        </select>
      </div>

      {/* CTA */}
      <div className="pt-2">
        <Link
          href={GOOGLE_FORM_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className={`block text-center rounded p-2 text-white ${isValid
            ? "bg-blue-500 hover:bg-blue-400"
            : "bg-blue-300 cursor-not-allowed pointer-events-none"
            }`}
        >
          Continue to Full Survey
        </Link>
      </div>
    </div>
  );
}