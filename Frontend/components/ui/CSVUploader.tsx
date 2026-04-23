"use client";

import { useState, useRef, useCallback } from "react";
import {
    Upload, FileText, AlertTriangle, CheckCircle2,
    XCircle, ChevronDown, ChevronUp, X, Loader2,
} from "lucide-react";

// ── types ─────────────────────────────────────────────────────────────────────

export interface CSVColumn<T> {
    // CSV header name (case-insensitive match)
    csvHeader: string;
    // Key in the parsed row object
    key: keyof T;
    label: string;
    required?: boolean;
    transform?: (value: string) => unknown;
}

export interface CSVUploaderProps<T extends object> {    // Label shown in the UI
    entityName: string;
    // Column definitions — maps CSV headers to typed fields
    columns: CSVColumn<T>[];
    // Called with deduplicated, validated rows ready to save
    onUpload: (rows: T[]) => Promise<{ saved: number; skipped: number; errors: string[] }>;
    // Existing records to check duplicates against
    existingData: T[];
    // Which key uniquely identifies a record (used for dupe check)
    uniqueKey: keyof T;
    // Optional sample CSV content for the download template
    sampleRows?: string[][];

    validateRow?: (row: T) => string | null;
}

interface ParsedRow<T> {
    index: number;
    data: T;
    status: "new" | "duplicate_file" | "duplicate_db" | "invalid";
    reason?: string;
}

// ── csv parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
    const lines = text.trim().split(/\r?\n/);
    return lines.map((line) => {
        const cols: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === "," && !inQuotes) {
                cols.push(current.trim());
                current = "";
            } else {
                current += ch;
            }
        }
        cols.push(current.trim());
        return cols;
    });
}
//  Unavailable day slot formatter
const formatUnavailable = (value: any) => {
    if (!Array.isArray(value)) return "—";

    if (value.length === 0) return "None";

    return value
        .map(
            (v) =>
                `${v.day}: ${v.start_hour}:00-${v.end_hour}:00`
        )
        .join(" | ");
};

// ── component ─────────────────────────────────────────────────────────────────

export default function CSVUploader<T extends object>({
    entityName,
    columns,
    onUpload,
    existingData,
    uniqueKey,
    sampleRows = [],
    validateRow,
}: CSVUploaderProps<T>) {
    const [rows, setRows] = useState<ParsedRow<T>[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{ saved: number; skipped: number; errors: string[] } | null>(null);
    const [showPreview, setShowPreview] = useState(true);
    const [parseError, setParseError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ── parse and validate ─────────────────────────────────────────────────────

    const processFile = useCallback((file: File) => {
        if (!file.name.endsWith(".csv")) {
            setParseError("Only .csv files are supported.");
            return;
        }
        setParseError(null);
        setResult(null);
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {

            const normalize = (v: any) => String(v).trim().toUpperCase();

            const getColleges = (obj: any): string[] =>
                Array.isArray(obj.colleges)
                    ? obj.colleges.map(normalize).filter(Boolean)
                    : [];

            const hasOverlap = (a: string[], b: string[]) => {
                const setB = new Set(b);
                return a.some((c) => setB.has(c));
            };
            const text = e.target?.result as string;
            const grid = parseCSV(text);
            if (grid.length < 2) {
                setParseError("File appears empty or has no data rows.");
                return;
            }

            // Map headers (case-insensitive)
            const headers = grid[0].map((h) => h.toLowerCase().trim());
            const dataRows = grid.slice(1).filter((r) => r.some((c) => c !== ""));

            // Track unique keys seen within this file for intra-file dupe detection
            // --- Separate tracking ---
            const seenInFileSet = new Set<string>(); // for normal entities
            const seenInFileHall: { name: string; colleges: string[] }[] = [];

            // Build DB records for Hall
            const existingRecords =
                entityName === "Hall"
                    ? existingData.map((r: any) => ({
                        name: String(r.name).trim().toLowerCase(),
                        colleges: getColleges(r),
                        hall_type: r.hall_type,
                    }))
                    : [];            // Build a set of existing unique key values for db dupe detection
            const existingKeys = new Set(
                existingData.map((r) => String(r[uniqueKey]).toLowerCase())
            );

            const parsed: ParsedRow<T>[] = dataRows.map((row, idx) => {
                const obj: Record<string, unknown> = {};
                let invalid = false;
                let invalidReason = "";

                for (const col of columns) {
                    const headerIdx = headers.indexOf(col.csvHeader.toLowerCase());
                    const rawValue = headerIdx >= 0 ? (row[headerIdx] ?? "").trim() : "";

                    if (col.required && !rawValue) {
                        invalid = true;
                        invalidReason = `Missing required field: "${col.csvHeader}"`;
                        break;
                    }

                    obj[col.key as string] = col.transform
                        ? col.transform(rawValue)
                        : rawValue;
                }

                if (invalid) {
                    return { index: idx + 2, data: obj as T, status: "invalid", reason: invalidReason };
                }

                if (validateRow) {
                    const validationError = validateRow(obj as T);
                    if (validationError) {
                        return {
                            index: idx + 2,
                            data: obj as T,
                            status: "invalid",
                            reason: validationError,
                        };
                    }
                }

                // =======================
                // HALL LOGIC
                // =======================
                if (entityName === "Hall") {
                    const name = String(obj.name ?? "").trim().toLowerCase();
                    const colleges = getColleges(obj);
                    const hallType = String(obj.hall_type ?? "").toLowerCase();

                    // 🔒 Structural validation
                    if (hallType === "general" && colleges.length > 0) {
                        return {
                            index: idx + 2,
                            data: obj as T,
                            status: "invalid",
                            reason: `General hall "${obj.name}" should not have any colleges`,
                        };
                    }

                    if (hallType === "college" && colleges.length !== 1) {
                        return {
                            index: idx + 2,
                            data: obj as T,
                            status: "invalid",
                            reason: `College hall "${obj.name}" must have exactly one college`,
                        };
                    }

                    if (hallType === "shared" && colleges.length < 2) {
                        return {
                            index: idx + 2,
                            data: obj as T,
                            status: "invalid",
                            reason: `Shared hall "${obj.name}" must have at least 2 colleges`,
                        };
                    }

                    // 🔁 Duplicate logic
                    if (hallType === "college" || hallType === "shared") {
                        const fileDup = seenInFileHall.find(
                            (r) => r.name === name && hasOverlap(r.colleges, colleges)
                        );

                        if (fileDup) {
                            return {
                                index: idx + 2,
                                data: obj as T,
                                status: "duplicate_file",
                                reason: `Hall "${obj.name}" shares at least one college with another row`,
                            };
                        }

                        const dbDup = existingRecords.find(
                            (r) => r.name === name && hasOverlap(r.colleges, colleges)
                        );

                        if (dbDup) {
                            return {
                                index: idx + 2,
                                data: obj as T,
                                status: "duplicate_db",
                                reason: `Hall "${obj.name}" conflicts with existing hall`,
                            };
                        }
                    }

                    seenInFileHall.push({ name, colleges });

                    return { index: idx + 2, data: obj as T, status: "new" };
                }

                // =======================
                // DEFAULT LOGIC
                // =======================
                const uniqueVal = String(obj[uniqueKey as string]).toLowerCase();

                if (seenInFileSet.has(uniqueVal)) {
                    return {
                        index: idx + 2,
                        data: obj as T,
                        status: "duplicate_file",
                        reason: `Duplicate within file (${String(uniqueKey)}: "${obj[uniqueKey as string]}")`,
                    };
                }

                if (existingKeys.has(uniqueVal)) {
                    return {
                        index: idx + 2,
                        data: obj as T,
                        status: "duplicate_db",
                        reason: `Already exists in database (${String(uniqueKey)}: "${obj[uniqueKey as string]}")`,
                    };
                }

                seenInFileSet.add(uniqueVal);

                return { index: idx + 2, data: obj as T, status: "new" };
            });

            setRows(parsed);
            setShowPreview(true);
        };
        reader.readAsText(file);
    }, [columns, existingData, uniqueKey]);

    // ── drag and drop ─────────────────────────────────────────────────────────

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, [processFile]);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    // ── submit ─────────────────────────────────────────────────────────────────

    const handleUpload = async () => {
        const newRows = rows.filter((r) => r.status === "new").map((r) => r.data);
        if (newRows.length === 0) return;

        setUploading(true);
        try {
            const res = await onUpload(newRows);
            setResult(res);
            setRows([]);
            setFileName(null);
        } catch {
            setResult({ saved: 0, skipped: 0, errors: ["Upload failed. Please try again."] });
        } finally {
            setUploading(false);
        }
    };

    // ── template download ──────────────────────────────────────────────────────

    const downloadTemplate = () => {
        const headers = columns.map((c) => c.csvHeader).join(",");
        const samples = sampleRows.map((r) => r.join(",")).join("\n");
        const csv = `${headers}\n${samples}`;
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${entityName.toLowerCase().replace(/\s+/g, "_")}_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── counts ─────────────────────────────────────────────────────────────────

    const newCount = rows.filter((r) => r.status === "new").length;
    const dupeCount = rows.filter((r) => r.status === "duplicate_file" || r.status === "duplicate_db").length;
    const invalidCount = rows.filter((r) => r.status === "invalid").length;

    const statusConfig = {
        new: { label: "New", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
        duplicate_file: { label: "Dupe (file)", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
        duplicate_db: { label: "Dupe (DB)", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
        invalid: { label: "Invalid", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
    };

    return (
        <div className="space-y-4">

            {/* ── drop zone ── */}
            {rows.length === 0 && !result && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`
            relative flex flex-col items-center justify-center gap-3
            border-2 border-dashed rounded-xl p-10 cursor-pointer
            transition-all duration-200 select-none
            ${dragOver
                            ? "border-blue-300 bg-blue-300/20"
                            : "border-blue-400 bg-blue-300/40 hover:border-blue-300 hover:bg-blue-300/20"
                        }
          `}
                >
                    <div className={`p-3 rounded-xl transition-colors ${dragOver ? "bg-blue-400" : "bg-white ring-1 ring-blue-400"}`}>
                        <Upload size={22} className={dragOver ? "text-white/80" : "text-blue-400"} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-black/20">
                            Drop your CSV here or <span className="text-indigo-400">browse</span>
                        </p>
                        <p className="text-xs text-black/60 mt-1">
                            Only .csv files · Headers must match the template
                        </p>
                    </div>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={onFileChange}
                    />
                </div>
            )}

            {/* ── parse error ── */}
            {parseError && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
                    <XCircle size={15} className="shrink-0" />
                    {parseError}
                </div>
            )}

            {/* ── template download ── */}
            {rows.length === 0 && !result && (
                <button
                    onClick={downloadTemplate}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg
            text-xs text-blue-400 hover:text-white/70 ring-1 ring-blue-400
            hover:ring-4 hover:ring-blue-400/70 transition-colors bg-white hover:bg-blue-400"
                >
                    <FileText size={12} />
                    Download CSV template
                </button>
            )}

            {/* ── file loaded — summary strip ── */}
            {rows.length > 0 && (
                <div className="space-y-3">
                    {/* File name + clear */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-500 border border-blue-400">
                        <div className="flex items-center gap-2 text-sm text-white/80">
                            <FileText size={14} className="text-white/80" />
                            <span className="font-mono">{fileName}</span>
                        </div>
                        <button
                            onClick={() => { setRows([]); setFileName(null); setResult(null); }}
                            className="text-white/80 hover:text-blue-900 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: "New", value: newCount, color: "text-emerald-400" },
                            { label: "Dupes", value: dupeCount, color: "text-amber-400" },
                            { label: "Invalid", value: invalidCount, color: "text-rose-400" },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="flex flex-col items-center py-3 rounded-lg bg-blue-900 border border-blue-800">
                                <span className={`font-mono text-xl font-medium ${color}`}>{value}</span>
                                <span className="text-xs text-white/80 mt-0.5">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Preview toggle */}
                    <button
                        onClick={() => setShowPreview((v) => !v)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg
              text-xs text-blue-500 hover:text-white border border-blue-500
               transition-colors bg-white hover:bg-blue-500 hover:text-white/80"
                    >
                        <span>Preview ({rows.length} rows)</span>
                        {showPreview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {/* Preview table */}
                    {showPreview && (
                        <div className="rounded-xl border border-blue-400 overflow-hidden">
                            <div className="overflow-x-auto max-h-64 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-blue-300 z-10">
                                        <tr className="border-b border-blue-400">
                                            <th className="px-3 py-2 text-left font-mono text-white/90 whitespace-nowrap">
                                                Row
                                            </th>
                                            {columns.map((col) => (
                                                <th key={String(col.key)} className="px-3 py-2 text-left font-mono text-white/90 whitespace-nowrap">
                                                    {col.label}
                                                </th>
                                            ))}
                                            <th className="px-3 py-2 text-left font-mono text-white/90">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => {
                                            const cfg = statusConfig[row.status];
                                            return (
                                                <tr
                                                    key={row.index}
                                                    className={`border-b border-blue-400 ${row.index % 2 === 0 ? "" : "bg-blue-100/30"} ${row.status !== "new" ? "opacity-50" : ""
                                                        }`}
                                                >
                                                    <td className="px-3 py-2 font-mono text-black/70">
                                                        {row.index - 1}
                                                    </td>
                                                    {columns.map((col) => (
                                                        <td key={String(col.key)} className="px-3 py-2 text-black/70 whitespace-nowrap">
                                                            {col.key === "unavailable_days_input"
                                                                ? formatUnavailable(row.data[col.key])
                                                                : String(row.data[col.key] ?? "—")}
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-2">
                                                        <span className={`px-2 py-0.5 rounded-md border text-xs font-mono ${cfg.bg} ${cfg.color}`}>
                                                            {cfg.label}
                                                        </span>
                                                        {row.reason && (
                                                            <p className="text-black/70 text-xs mt-0.5 max-w-xs truncate">
                                                                {row.reason}
                                                            </p>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Warning if dupes/invalids exist */}
                    {(dupeCount > 0 || invalidCount > 0) && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-300">
                                {dupeCount > 0 && `${dupeCount} duplicate${dupeCount !== 1 ? "s" : ""} will be skipped. `}
                                {invalidCount > 0 && `${invalidCount} invalid row${invalidCount !== 1 ? "s" : ""} will be skipped.`}
                                {newCount === 0 && " Nothing new to import."}
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setRows([]); setFileName(null); }}
                            className="flex-1 py-2 rounded-lg text-sm ring-1 ring-blue-500
                text-blue-500 hover:text-white/80 hover:ring-4 hover:ring-blue-400/70 hover:bg-blue-500 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={newCount === 0 || uploading}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg
                text-sm font-medium bg-blue-500 hover:bg-blue-400
                disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                        >
                            {uploading
                                ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                                : `Import ${newCount} row${newCount !== 1 ? "s" : ""}`
                            }
                        </button>
                    </div>
                </div>
            )}

            {/* ── result ── */}
            {result && (
                <div className="space-y-3">
                    <div className={`flex items-start gap-3 p-4 rounded-xl border ${result.errors.length > 0
                        ? "bg-amber-500/10 border-amber-500/20"
                        : "bg-emerald-500/10 border-emerald-500/20"
                        }`}>
                        {result.errors.length > 0
                            ? <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                            : <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        }
                        <div>
                            <p className={`text-sm font-medium ${result.errors.length > 0 ? "text-amber-300" : "text-emerald-300"}`}>
                                {result.saved} {entityName}{result.saved !== 1 ? "s" : ""} imported successfully
                                {result.skipped > 0 && `, ${result.skipped} skipped`}.
                            </p>
                            {result.errors.map((err, i) => (
                                <p key={i} className="text-xs text-rose-400 mt-1">{err}</p>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={() => setResult(null)}
                        className="w-full py-2 rounded-lg text-sm ring-1 ring-blue-500 bg-white
              text-blue-500 hover:text-white/80 hover:ring-4 hover:ring-blue-400/70 hover:bg-blue-500 transition-colors"
                    >
                        Upload another file
                    </button>
                </div>
            )}
        </div>
    );
}