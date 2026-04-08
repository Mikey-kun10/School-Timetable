import { Department, Lecturer, Hall, Course } from "./types";

const API_BASE = "http://127.0.0.1:8000/api";

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error: ${res.status} - ${errorText}`);
  }
  return res.json();
}

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
  generate: () => fetcher<any>("/timetable/generate/", { method: "POST" }),
  view: () => fetcher<any[]>("/timetable/view/"),
};
