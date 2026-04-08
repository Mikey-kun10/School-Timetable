export type Day =
  | "Monday" | "Tuesday" | "Wednesday"
  | "Thursday" | "Friday";

export const DAYS: Day[] = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
];

export const LEVELS = [100, 200, 300, 400, 500];

export const TIME_SLOTS = [
  "8:00 - 9:00", "9:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "01:00 - 02:00", "02:00 - 03:00", "03:00 - 04:00", "04:00 - 05:00", "05:00 - 06:00",
];

export interface Department {
  id?: number;
  name: string;
  code: string;
}

export interface Lecturer {
  id?: number;
  first_name: string;
  last_name: string;
  staff_id: string;
  department: number;
  email: string;
  unavailable_days?: { id: number, day: string }[];
  unavailable_days_input?: string[]; // For API submission
}

export interface Hall {
  id?: number;
  name: string;
  capacity: number;
  hall_type: "department" | "shared" | "general";
  departments: number[];
}

export interface Course {
  id?: number;
  name: string;
  code: string;
  department: number;
  level: number;
  course_type: "departmental" | "shared" | "general";
  shared_departments: number[];
  units: number;
  hours: number;
  student_count: number;
  lecturer?: number | null;
  shared_session_id?: string | null;
}