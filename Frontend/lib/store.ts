import { Department, Lecturer, Hall, Course } from "./types";

function getAll<T>(key: string): T[] {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(localStorage.getItem(key) ?? "[]");
    } catch {
        return [];
    }
}

function saveAll<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
    return Math.random().toString(36).slice(2, 10);
}

// ── Departments ──────────────────────────────────────────────────────────────

export const departmentStore = {
    getAll: (): Department[] => getAll<Department>("departments"),

    add: (data: Omit<Department, "id">): Department => {
        const record = { ...data, id: generateId() };
        const all = departmentStore.getAll();
        saveAll("departments", [...all, record]);
        return record;
    },

    update: (id: string, data: Omit<Department, "id">): Department => {
        const all = departmentStore.getAll();
        const updated = all.map((d) => (d.id === id ? { ...d, ...data } : d));
        saveAll("departments", updated);
        return updated.find((d) => d.id === id)!;
    },

    remove: (id: string): void => {
        saveAll("departments", departmentStore.getAll().filter((d) => d.id !== id));
    },
};

// ── Lecturers ────────────────────────────────────────────────────────────────

export const lecturerStore = {
    getAll: (): Lecturer[] => getAll<Lecturer>("lecturers"),

    add: (data: Omit<Lecturer, "id">): Lecturer => {
        const record = { ...data, id: generateId() };
        saveAll("lecturers", [...lecturerStore.getAll(), record]);
        return record;
    },

    update: (id: string, data: Omit<Lecturer, "id">): Lecturer => {
        const all = lecturerStore.getAll();
        const updated = all.map((l) => (l.id === id ? { ...l, ...data } : l));
        saveAll("lecturers", updated);
        return updated.find((l) => l.id === id)!;
    },

    remove: (id: string): void => {
        saveAll("lecturers", lecturerStore.getAll().filter((l) => l.id !== id));
    },
};

// ── Halls ────────────────────────────────────────────────────────────────────

export const hallStore = {
    getAll: (): Hall[] => getAll<Hall>("halls"),

    add: (data: Omit<Hall, "id">): Hall => {
        const record = { ...data, id: generateId() };
        saveAll("halls", [...hallStore.getAll(), record]);
        return record;
    },

    update: (id: string, data: Omit<Hall, "id">): Hall => {
        const all = hallStore.getAll();
        const updated = all.map((h) => (h.id === id ? { ...h, ...data } : h));
        saveAll("halls", updated);
        return updated.find((h) => h.id === id)!;
    },

    remove: (id: string): void => {
        saveAll("halls", hallStore.getAll().filter((h) => h.id !== id));
    },
};

// ── Courses ──────────────────────────────────────────────────────────────────

export const courseStore = {
    getAll: (): Course[] => getAll<Course>("courses"),

    add: (data: Omit<Course, "id">): Course => {
        const record = { ...data, id: generateId() };
        saveAll("courses", [...courseStore.getAll(), record]);
        return record;
    },

    update: (id: string, data: Omit<Course, "id">): Course => {
        const all = courseStore.getAll();
        const updated = all.map((c) => (c.id === id ? { ...c, ...data } : c));
        saveAll("courses", updated);
        return updated.find((c) => c.id === id)!;
    },

    remove: (id: string): void => {
        saveAll("courses", courseStore.getAll().filter((c) => c.id !== id));
    },
};