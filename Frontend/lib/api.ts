import { College, Department, Lecturer, Hall, Course, GenerateResult, TimetableEntry } from "./types";

const API_BASE = "http://127.0.0.1:8000/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    let message = `API Error: ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data === "object" && data !== null) {
        // Handle DRF validation error objects: { "field": ["error"] } or { "detail": "error" }
        if (data.detail) {
          message = data.detail;
        } else {
          message = Object.entries(data)
            .map(([field, errors]) => {
              const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ");
              const errs = Array.isArray(errors) ? errors.join(", ") : String(errors);
              return `${fieldName}: ${errs}`;
            })
            .join(" | ");
        }
      }
    } catch {
      // Fallback if not JSON
      const text = await res.text();
      message = text.length < 100 ? text : `Server error (${res.status})`;
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

// ── Colleges ─────────────────────────────────────────────────────────────────
export const collegeApi = {
  getAll: () => fetcher<College[]>("/colleges/"),
  add: (data: College) => fetcher<College>("/colleges/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<College>) => fetcher<College>(`/colleges/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: number) => fetcher<void>(`/colleges/${id}/`, { method: "DELETE" }),
};

// ── Departments ──────────────────────────────────────────────────────────────
export const departmentApi = {
  getAll: () => fetcher<Department[]>("/departments/"),
  add: (data: Department) => fetcher<Department>("/departments/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Department>) => fetcher<Department>(`/departments/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: number) => fetcher<void>(`/departments/${id}/`, { method: "DELETE" }),
};

// ── Lecturers ────────────────────────────────────────────────────────────────
export const lecturerApi = {
  getAll: () => fetcher<Lecturer[]>("/lecturers/"),
  add: (data: Lecturer) => fetcher<Lecturer>("/lecturers/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Lecturer>) => fetcher<Lecturer>(`/lecturers/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: number) => fetcher<void>(`/lecturers/${id}/`, { method: "DELETE" }),
};

// ── Halls ────────────────────────────────────────────────────────────────────
export const hallApi = {
  getAll: () => fetcher<Hall[]>("/halls/"),
  add: (data: Hall) => fetcher<Hall>("/halls/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Hall>) => fetcher<Hall>(`/halls/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: number) => fetcher<void>(`/halls/${id}/`, { method: "DELETE" }),
};

// ── Courses ──────────────────────────────────────────────────────────────────
export const courseApi = {
  getAll: () => fetcher<Course[]>("/courses/"),
  add: (data: Course) => fetcher<Course>("/courses/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Course>) => fetcher<Course>(`/courses/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: number) => fetcher<void>(`/courses/${id}/`, { method: "DELETE" }),
};

export const timetableApi = {
  generate: () => fetcher<GenerateResult>("/timetable/generate/", { method: "POST" }),
  view: () => fetcher<TimetableEntry[]>("/timetable/view/"),
};
