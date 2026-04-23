export type Day =
  | "Monday" | "Tuesday" | "Wednesday"
  | "Thursday" | "Friday";

export const DAYS: Day[] = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
];

export const LEVELS = [100, 200, 300, 400, 500];

export const TIME_SLOTS = [
  "8:00 - 9:00", "9:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 1:00", "01:00 - 02:00", "02:00 - 03:00", "03:00 - 04:00", "04:00 - 05:00", "05:00 - 06:00",
];

export function createParamCounter() {
  let lastParam: number | null = null;
  let count = 0;

  return function (param: number): number {
    if (param === lastParam) {
      count += 1;
    } else {
      lastParam = param;
      count = 1;
    }

    return count;
  };
}

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

export interface UnavailabilityBlock {
  day: string;
  start_hour: number;
  end_hour: number;
}

export interface Lecturer {
  id?: number;
  first_name: string;
  last_name: string;
  staff_id: string;
  college: number | College;
  email: string;
  unavailable_days?: { id: number, day: string, start_hour: number, end_hour: number }[];
  unavailable_days_input?: { day: string, start_hour: number, end_hour: number }[]; // For API submission
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
    duration: number;
    start_time_display: string;
    end_time_display: string;
  };
}

export interface GenerateResult {
  message?: string;
  unscheduled?: { course: string; reason: string; dept_code: string; level: number }[];
}