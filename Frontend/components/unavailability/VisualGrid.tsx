"use client";

import { Day, DAYS } from "@/lib/types";
import { useState, useCallback } from "react";

interface UnavailabilityBlock {
  day: string;
  start_hour: number;
  end_hour: number;
}

interface Props {
  value: UnavailabilityBlock[];
  onChange: (value: UnavailabilityBlock[]) => void;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

const formatHour = (h: number) => {
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
};

export default function VisualGrid({ value, onChange }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState<boolean | null>(null);

  const isUnavailable = useCallback((day: string, hour: number) => {
    return value.some(v => v.day === day && hour >= v.start_hour && hour < v.end_hour);
  }, [value]);

  const toggle = (day: string, hour: number, forceValue?: boolean) => {
    const currentlyOn = isUnavailable(day, hour);
    const targetOn = forceValue !== undefined ? forceValue : !currentlyOn;

    if (currentlyOn === targetOn) return;

    if (targetOn) {
      // Add a 1-hour block if not already covered
      onChange([...value, { day, start_hour: hour, end_hour: hour + 1 }]);
    } else {
      // Remove or slice existing blocks
      const next = value.flatMap(v => {
        if (v.day !== day) return [v];
        if (hour < v.start_hour || hour >= v.end_hour) return [v];
        
        // Split if in middle, or trim if at edges
        const results = [];
        if (hour > v.start_hour) {
          results.push({ ...v, end_hour: hour });
        }
        if (hour + 1 < v.end_hour) {
          results.push({ ...v, start_hour: hour + 1 });
        }
        return results;
      });
      onChange(next);
    }
  };

  const handleMouseDown = (day: string, hour: number) => {
    setIsDragging(true);
    const targetState = !isUnavailable(day, hour);
    setDragValue(targetState);
    toggle(day, hour, targetState);
  };

  const handleMouseEnter = (day: string, hour: number) => {
    if (isDragging && dragValue !== null) {
      toggle(day, hour, dragValue);
    }
  };

  const stopDragging = () => {
    setIsDragging(false);
    setDragValue(null);
    
    // Normalize blocks (merge adjacent same-day blocks)
    normalize();
  };

  const normalize = () => {
    const next: UnavailabilityBlock[] = [];
    const byDay: Record<string, UnavailabilityBlock[]> = {};
    
    value.forEach(v => {
      byDay[v.day] = byDay[v.day] || [];
      byDay[v.day].push(v);
    });

    Object.keys(byDay).forEach(day => {
      const sorted = byDay[day].sort((a, b) => a.start_hour - b.start_hour);
      if (sorted.length === 0) return;

      let current = { ...sorted[0] };
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start_hour <= current.end_hour) {
          current.end_hour = Math.max(current.end_hour, sorted[i].end_hour);
        } else {
          next.push(current);
          current = { ...sorted[i] };
        }
      }
      next.push(current);
    });
    
    onChange(next);
  };

  return (
    <div className="space-y-4" onMouseUp={stopDragging} onMouseLeave={stopDragging}>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm p-1">
        <table className="w-full border-collapse select-none">
          <thead>
            <tr>
              <th className="p-2 w-16"></th>
              {HOURS.map(h => (
                <th key={h} className="p-2 text-[10px] font-mono font-medium text-slate-400 uppercase tracking-tighter text-center">
                  {formatHour(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => (
              <tr key={day}>
                <td className="p-2 text-[11px] font-bold text-slate-600 bg-slate-50 border-r border-slate-100 uppercase tracking-wider">
                  {day.slice(0, 3)}
                </td>
                {HOURS.map(h => {
                  const active = isUnavailable(day, h);
                  return (
                    <td
                      key={h}
                      onMouseDown={() => handleMouseDown(day, h)}
                      onMouseEnter={() => handleMouseEnter(day, h)}
                      className={`
                        p-0.5 border border-slate-100 transition-all cursor-pointer
                      `}
                    >
                      <div className={`
                        h-8 w-full rounded-md
                        ${active ? 'bg-rose-500 shadow-inner' : 'bg-slate-100 hover:bg-slate-200'}
                      `} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex items-center gap-4 text-[10px] uppercase font-mono text-slate-400 font-bold ml-1">
          <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
              <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-rose-500" />
              <span>Unavailable</span>
          </div>
          <p className="text-slate-300 italic ml-auto mr-1 select-none">Click or drag to toggle time blocks</p>
      </div>
    </div>
  );
}
