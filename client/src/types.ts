export interface Task {
  id: number;
  description: string;
  scheduled_date: string;
  sort_order: number;
  time_start: string | null;
  time_end: string | null;
  location: string | null;
  created_at: string;
}

export type Mode = 'focus' | 'planning';

export interface ModeResponse {
  mode: Mode;
  today: string;
}

export interface EndDayResponse {
  newDate: string;
  mode: Mode;
  carriedForwardCount: number;
}

export interface StartDayResponse {
  date: string;
  mode: Mode;
}
