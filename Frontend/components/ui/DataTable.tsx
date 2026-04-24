"use client";

import { useState, useMemo } from "react";
import { Search, Pencil, Trash2, Plus, ChevronDown, X, FileUp } from "lucide-react";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  filterable?: boolean;        // opt-in per column
  filterOptions?: string[];    // if provided, renders a dropdown instead of text input
  filterValue?: (row: T) => string | string[]; // custom value for filtering
}

interface Props<T extends { id?: number | string }> {
  title: string;
  columns: Column<T>[];
  data: T[];
  onAdd: () => void;
  onEdit: (row: T) => void;
  onDelete: (id: NonNullable<T["id"]>) => void;
  onImport?: () => void;
  loading?: boolean;
}

export default function DataTable<T extends { id?: number | string }>({
  title, columns, data, onAdd, onEdit, onImport, onDelete, loading,
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const filterableColumns = columns.filter((c) => c.filterable);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const setFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilter = (key: string) => {
    setFilters((prev) => ({ ...prev, [key]: "" }));
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearch("");
  };

  const DAY_SHORT = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
  ];

  // Build filtered data
  const filtered = useMemo(() => {
    return data.filter((row) => {
      // Global search
      if (search) {
        const haystack = Object.values(row as object)
          .flat()
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }

      // Per-column filters
      for (const [key, value] of Object.entries(filters)) {
        if (!value) continue;
        const col = columns.find((c) => String(c.key) === key);
        let raw: unknown;

        if (col?.filterValue) {
          raw = col.filterValue(row);
        } else {
          raw = (row as Record<string, unknown>)[key];
        }

        const cellStr = Array.isArray(raw)
          ? raw.join(", ").toLowerCase()
          : String(raw ?? "").toLowerCase();
        if (!cellStr.includes(value.toLowerCase())) return false;
      }

      return true;
    });
  }, [data, search, filters, columns]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-right gap-3">
        <div>
          <h3 className="font-semibold text-black/60">{title}</h3>
          <p className="font-mono text-xs text-blue-500 mt-0.5">
            {data.length} record{data.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-black/60"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="
                pl-9 pr-4 py-2 text-sm rounded-lg bg-white border border-black/60
                text-black/60 placeholder-black/60 focus:ring-4
                focus:outline-none focus:ring-1 focus:ring-blue-400/30
                w-48
              "
            />
          </div>
          {/* Filter toggle — only shown if any column has filterable: true */}
          {filterableColumns.length > 0 && (
            <button
              onClick={() => setFilterPanelOpen((v) => !v)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors shadow-md shadow-blue-600/20
                ${filterPanelOpen || activeFilterCount > 0
                  ? "bg-blue-400 border-blue-300 text-white/70"
                  : "bg-blue-500 border-blue-400 text-white hover:bg-blue-400 hover:border-blue-300"
                }
              `}
            >
              <ChevronDown
                size={14}
                className={`transition-transform ${filterPanelOpen ? "rotate-180" : ""}`}
              />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-md text-xs bg-blue-500 text-white/90 font-mono">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {/* Add button */}
          <button
            onClick={onAdd}
            className="
              flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
              bg-blue-500 shadow-md shadow-blue-600/20 hover:bg-blue-400 active:scale-95 text-white transition-colors
            "
          >
            <Plus size={14} />
            Add
          </button>
          {onImport && (
            <button
              onClick={onImport}
              className="
                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm
                        font-medium bg-white border border-blue-400 hover:ring-4 hover:ring-blue-400/70 hover:bg-blue-500 hover:text-white
                        text-blue-400 transition-all active:scale-95 no-print
                      "
            >
              <FileUp size={14} />
              Upload
            </button>
          )}
        </div>
      </div>

      {/* ── filter panel ── */}
      {filterPanelOpen && filterableColumns.length > 0 && (
        <div className="p-4 rounded-xl bg-blue-900 border border-blue-800 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-mono text-white uppercase tracking-wider">
              Filters
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-white hover:text-rose-400 transition-colors flex items-center gap-1"
              >
                <X size={11} />
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filterableColumns.map((col) => {
              const key = String(col.key);
              const value = filters[key] ?? "";

              return (
                <div key={key}>
                  <label className="block text-xs text-white/70 mb-1.5">
                    {col.label}
                  </label>

                  {col.filterOptions ? (
                    // Dropdown filter
                    <div className="relative">
                      <select
                        value={value}
                        onChange={(e) => setFilter(key, e.target.value)}
                        className="
                          w-full px-3 py-2 text-sm rounded-lg bg-white border border-blue-400
                          text-black/60 focus:outline-none focus:border-blue-400 focus:ring-4 
                          focus:ring-blue-400/70 transition-all appearance-none
                        "
                      >
                        <option value="">All</option>
                        {col.filterOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {value && (
                        <button
                          onClick={() => clearFilter(key)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ) : (
                    // Text filter
                    <div className="relative">
                      <input
                        value={value}
                        onChange={(e) => setFilter(key, e.target.value)}
                        placeholder={`Filter by ${col.label.toLowerCase()}…`}
                        className="
                          w-full px-3 py-2 text-sm rounded-lg bg-white border border-blue-400 
                          placeholder-slate-600 text-black/60 focus:outline-none focus:border-blue-400
                          focus:ring-4 focus:ring-blue-400/70 transition-all pr-8
                        "
                      />
                      {value && (
                        <button
                          onClick={() => clearFilter(key)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── active filter pills ── */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters)
            .filter(([, v]) => v)
            .map(([key, value]) => {
              const col = columns.find((c) => String(c.key) === key);
              return (
                <span
                  key={key}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs
                    bg-blue-500/10 border border-blue-500/20 text-blue-300"
                >
                  <span className="text-blue-400/70">{col?.label}:</span>
                  {value}
                  <button
                    onClick={() => clearFilter(key)}
                    className="text-blue-400/50 hover:text-blue-400 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })}
        </div>
      )}


      {/* Table */}
      <div className="rounded-xl border border-blue-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-800 bg-blue-900">
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className={`${DAY_SHORT.includes(col.label) ? "px-1" : "px-4"} py-3 text-left font-mono text-xs text-white/80 uppercase tracking-wider whitespace-nowrap`}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-mono text-xs text-white/80 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-blue-400">
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-4 py-3">
                        <div className="h-3.5 bg-blue-500 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="h-3.5 bg-blue-500 rounded animate-pulse w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-12 text-center text-blue-500 text-sm"
                  >
                    {search ? "No results found." : "No records yet. Add one to get started."}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-blue-800 hover:bg-blue-200/20 transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={String(col.key)} className={`${DAY_SHORT.includes(col.label) ? "px-1" : "px-4"} py-3 text-black/40`}>
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key as string] ?? "—")}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(row)}
                          className="p-1.5 rounded-md text-black/40 hover:text-blue-500 hover:bg-blue-400/30 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => onDelete(row.id as NonNullable<T["id"]>)}
                          className="p-1.5 rounded-md text-black/40 hover:text-blue-500 hover:bg-blue-400/30 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}