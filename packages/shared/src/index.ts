export interface Me {
  studentId: string;
  userId: string | null;
  displayName: string;
  schoolName: string;
}

export interface Lesson {
  subject: string;
  subjectId: string | null;
  teachers: string | null;
  room: string | null;
  roomId: string | null;
  canceled: boolean;
  late: boolean;
  absent: boolean;
  note: string | null;
}

export interface TimetableSlot {
  name: string;
  /** "HH:MM" */
  start: string | null;
  end: string | null;
  /** One entry per weekday column; each may hold several group lessons. */
  days: Lesson[][];
}

export interface DayEvent {
  title: string;
  eventId: string | null;
}

export interface TimetableDay {
  name: string;
  /** "YYYY-MM-DD", derived from week start. */
  date: string | null;
  events: DayEvent[];
}

export interface Timetable {
  /** Monday, "YYYY-MM-DD". */
  weekStart: string | null;
  days: TimetableDay[];
  slots: TimetableSlot[];
}

export interface RecentMark {
  subject: string;
  subjectId: string | null;
  /** What IDU shows on the dashboard: the mark value, or the teacher's comment when one exists. */
  label: string;
  description: string | null;
  /** ISO date or date-time. */
  date: string | null;
}

export type PresenceKind = "present" | "absent" | "justified" | "late" | "other";

export interface RecentPresence {
  subject: string;
  subjectId: string | null;
  kind: PresenceKind;
  label: string;
  date: string | null;
}

export interface UpcomingEvent {
  title: string;
  subject: string | null;
  kind: "exam" | "event";
  date: string | null;
  /** True when IDU gives a time, i.e. `date` is a date-time. */
  hasTime: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  date: string | null;
  updated: string | null;
  pinned: boolean;
  priority: number;
  comments: number;
  read: boolean;
}

export interface Home {
  me: Me;
  timetable: Timetable;
  recentMarks: RecentMark[];
  recentPresences: RecentPresence[];
  events: UpcomingEvent[];
  news: NewsItem[];
}

export interface Mark {
  /** Stable key for "new" tracking. */
  key: string;
  value: string;
  category: string | null;
  description: string | null;
  comment: string | null;
  date: string | null;
  weight: number | null;
  cumulative: boolean;
}

export interface SubjectGrades {
  subject: string;
  subjectId: string | null;
  marks: Mark[];
}

export interface Grades {
  subjects: SubjectGrades[];
}

export interface AttendanceCounts {
  present: number;
  absent: number;
  justified: number;
  late: number;
  total: number;
  /** Present / total, 0–100, as IDU reports it. */
  percent: number | null;
}

export interface Attendance {
  totals: AttendanceCounts;
  subjects: (AttendanceCounts & { subject: string; subjectId: string | null })[];
}

export interface NewsList {
  items: NewsItem[];
}

export interface NewsArticle {
  id: string;
  title: string;
  /** Sanitized on the server. */
  html: string;
}

export type ApiErrorCode =
  | "session_expired"
  | "invalid_credentials"
  | "idu_unavailable"
  | "parse_failed"
  | "rate_limited"
  | "bad_request";

export interface ApiError {
  error: ApiErrorCode;
}
