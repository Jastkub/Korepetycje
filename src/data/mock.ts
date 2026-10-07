/**
 * Dane STARTOWE („nasiona"). Przy pierwszym uruchomieniu trafiają do magazynu
 * (store) i od tego momentu apka pracuje na kopii zapisanej w telefonie.
 * Później zamienimy to źródło na bazę w chmurze (Supabase).
 */

export type AttendanceStatus =
  | 'planned' // zaplanowana
  | 'present' // był
  | 'absent' // nieobecny
  | 'late' // spóźniony
  | 'cancelled'; // odwołane

export type Homework = {
  id: string;
  text: string;
  due: string; // np. "pt", "2 dni po terminie"
  done: boolean;
};

export type StudentColor =
  | 'accent'
  | 'indigo'
  | 'sage'
  | 'amber'
  | 'rose'
  | 'teal'
  | 'violet'
  | 'blue';

export type Student = {
  id: string;
  name: string;
  initials: string;
  color: string; // hex, np. '#c65b3c' (patrz theme/studentColors)
  grade: string;
  subject: string;
  rate: number;
  packageDone: number;
  packageTotal: number;
  attendancePct: number;
  contactLabel: string;
  contact: string;
  materialTitle: string;
  materialProgress: number;
  homework: Homework[];
};

export type Day = 'Pon' | 'Wt' | 'Śr' | 'Czw' | 'Pt' | 'Sob' | 'Nd';

export type Lesson = {
  id: string;
  studentId: string;
  name: string;
  subject: string;
  grade: string;
  date: string; // 'YYYY-MM-DD' — konkretny dzień lekcji
  day: Day; // skrót dnia tygodnia (wyliczany z daty)
  start: string;
  end: string;
  status: AttendanceStatus;
  rate: number;
  paid: boolean;
  note?: string;
};

/** Który dzień traktujemy jako „dzisiaj" (na pulpit). Na razie na sztywno. */
export const TODAY_DAY: Day = 'Śr';

export const WEEK_DAYS: Day[] = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];

export const SUBJECTS = [
  'Matematyka',
  'Język polski',
  'Język angielski',
  'Język niemiecki',
  'Język hiszpański',
  'Język francuski',
  'Język rosyjski',
  'Łacina',
  'Fizyka',
  'Chemia',
  'Biologia',
  'Geografia',
  'Historia',
  'WOS',
  'Informatyka',
  'Przyroda',
  'Przedsiębiorczość',
  'Ekonomia',
  'Filozofia',
  'Muzyka',
  'Plastyka',
  'Technika',
  'EDB',
  'Religia',
  'Etyka',
];

