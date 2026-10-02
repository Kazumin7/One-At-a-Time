import type { Task, ModeResponse, EndDayResponse, StartDayResponse } from './types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getMode(): Promise<ModeResponse> {
  return request<ModeResponse>('/mode');
}

export function getTodayTasks(): Promise<Task[]> {
  return request<Task[]>('/tasks/today');
}

export function getTomorrowTasks(): Promise<Task[]> {
  return request<Task[]>('/tasks/tomorrow');
}

export function createTask(data: {
  description: string;
  scheduled_date: string;
  time_start?: string;
  time_end?: string;
  location?: string;
}): Promise<Task> {
  return request<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTask(id: number, data: Partial<Task>): Promise<Task> {
  return request<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function completeTask(id: number): Promise<void> {
  return request<void>(`/tasks/${id}/complete`, {
    method: 'PATCH',
  });
}

export function reorderTasks(taskIds: number[]): Promise<void> {
  return request<void>('/tasks/reorder', {
    method: 'PUT',
    body: JSON.stringify({ taskIds }),
  });
}

export function deleteTask(id: number): Promise<void> {
  return request<void>(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

export function endDay(): Promise<EndDayResponse> {
  return request<EndDayResponse>('/end-day', {
    method: 'POST',
  });
}

export function startDay(): Promise<StartDayResponse> {
  return request<StartDayResponse>('/start-day', {
    method: 'POST',
  });
}

export function setDate(date: string): Promise<ModeResponse> {
  return request<ModeResponse>('/set-date', {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

export function getTasksByDate(date: string): Promise<Task[]> {
  return request<Task[]>(`/tasks/date/${date}`);
}

export function getCalendarCounts(from: string, to: string): Promise<Record<string, number>> {
  return request<Record<string, number>>(`/tasks/calendar?from=${from}&to=${to}`);
}
