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

export interface College {
  id?: number;
  name: string;
  code: string;
}

export interface Department {
  id?: number;
  name: string;
  code: string;
  college: number | College;
}

export interface Lecturer {
  id?: number;
  first_name: string;
  last_name: string;
  staff_id: string;
  college: number | College;
  email: string;
  unavailable_days?: { id: number, day: string }[];
  unavailable_days_input?: string[]; // For API submission
}

export interface Hall {
  id?: number;
  name: string;
  capacity: number;
  hall_type: "college" | "shared" | "general";
  colleges: (number | College)[];
}

export interface Course {
  id?: number;
  name: string;
  code: string;
  department?: number | Department | null;
  level: number;
  course_type: "departmental" | "shared" | "general";
  shared_departments: (number | Department)[];
  units: number;
  hours: number;
  student_count: number;
  lecturer: number | Lecturer;
  shared_session_id?: string | null;
}

export interface TimetableEntry {
  id: number;
  course: Course;
  hall: Hall;
  lecturer: Lecturer;
  time_slot: {
    day: string;
    start_hour: number;
    end_hour: number;
  };
}

export interface GenerateResult {
  message?: string;
  unscheduled?: { course: string; reason: string }[];
}