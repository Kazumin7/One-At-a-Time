import { getAppState, type Mode } from './db.js';

export function getCurrentMode(): Mode {
  return getAppState().currentMode;
}

export function getTodayDate(): string {
  return getAppState().currentDate;
}

export function getTomorrowDate(): string {
  const d = new Date(getAppState().currentDate + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}
