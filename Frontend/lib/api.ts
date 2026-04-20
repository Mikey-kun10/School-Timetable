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
  const isFormData = options?.body instanceof FormData;

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });

  if (res.status === 204) return null as T;

  const raw = await res.text();
  let parsed: any = null;

  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = raw;
  }

  if (!res.ok) {
    let message = `API Error: ${res.status}`;

    if (typeof parsed === "object" && parsed !== null) {
      if (parsed.detail) {
        message = parsed.detail;
      } else {
        message = Object.entries(parsed)
          .map(([field, errors]) => {
            const fieldName =
              field.charAt(0).toUpperCase() +
              field.slice(1).replace(/_/g, " ");
            const errs = Array.isArray(errors)
              ? errors.join(", ")
              : String(errors);
            return `${fieldName}: ${errs}`;
          })
          .join(" | ");
      }
    } else if (typeof parsed === "string") {
      message =
        parsed.length < 100 ? parsed : `Server error (${res.status})`;
    }

    throw new ApiError(message, res.status);
  }

  return parsed as T;
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
