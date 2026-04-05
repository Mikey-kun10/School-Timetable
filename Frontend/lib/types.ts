export type Day =
  | "Monday" | "Tuesday" | "Wednesday"
  | "Thursday" | "Friday";

export const DAYS: Day[] = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
];

export const LEVELS = ["100", "200", "300", "400", "500"];

export const TIME_SLOTS = [
  "8:00 - 9:00", "9:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "01:00 - 02:00", "02:00 - 03:00", "03:00 - 04:00", "04:00 - 05:00", "05:00 - 06:00",
];

export const COLLEGES = [
  {name: "College of Agriculture, Engineering and Science", code: "COAES"},
  {name: "College of Management and Social Sciences", code: "COSMS"},
  {name: "College of Liberal Studies", code: "COLIBS"},
  {name: "College of Computing and Communication Studies", code: "COCCS"},
  {name: "College of Health Sciences", code: "COHES"},
  {name: "College of Law", code: "COLAW"},
  {name: "College of Environmental Sciences", code: "COEVS"},
];

export interface Department {
  id: string;
  name: string;
  code: string;
  college: string;
  studentCount: number;
  level: string;
}

export interface Lecturer {
  id: string;
  name: string;
  email: string;
  college: string;
  availableDays: string[];
}

export interface Hall {
  id: string;
  name: string;
  code: string;
  capacity: number;
  college: string;
}

export interface Course {
  id: string;
  courseCode: string;
  title: string;
  college: string;
  duration: number;
  level: string;
  departments: string[];
  lecturerId: string;
  departmentId?: string;
}