/**
 * Convert 24h time string "17:30" to "5:30 PM"
 */
export function formatTime(time24: string): string {
  const [hourStr, minute] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${minute} ${ampm}`;
}

/**
 * Add one day to a YYYY-MM-DD date string
 */
export function addOneDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/**
 * Check if a task description is a journal entry (starts with "j-")
 */
export function isJournalTask(description: string): boolean {
  return description.toLowerCase().startsWith('j-');
}

/**
 * Get the display text for a journal task (strip the "j-" prefix)
 */
export function getJournalDisplayText(description: string): string {
  return description.slice(2).trim();
}

/**
 * Format a date string for display, e.g. "Wednesday, January 15"
 */
export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00'); // noon to avoid timezone issues
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
