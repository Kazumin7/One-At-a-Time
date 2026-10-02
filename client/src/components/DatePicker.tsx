import { useState, useRef, useEffect } from 'react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  displayFormat?: (date: string) => string;
  className?: string;
}

export default function DatePicker({ value, onChange, displayFormat, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Show the month containing the selected date + next month
  const selectedDate = new Date(value + 'T12:00:00');
  const currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

  const defaultDisplay = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };
  const format = displayFormat || defaultDisplay;

  const handleSelect = (date: string) => {
    onChange(date);
    setOpen(false);
  };

  return (
    <div className={`date-picker ${className || ''}`} ref={ref}>
      <button
        type="button"
        className="date-picker-trigger"
        onClick={() => setOpen(!open)}
      >
        {format(value)}
      </button>
      {open && (
        <div className="date-picker-dropdown">
          <MonthGrid month={currentMonth} selected={value} onSelect={handleSelect} />
          <MonthGrid month={nextMonth} selected={value} onSelect={handleSelect} />
        </div>
      )}
    </div>
  );
}

// --- Internal MonthGrid sub-component ---

interface MonthGridProps {
  month: Date;
  selected: string;
  onSelect: (date: string) => void;
}

function MonthGrid({ month, selected, onSelect }: MonthGridProps) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const toDateStr = (day: number) => {
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  return (
    <div className="month-grid">
      <div className="month-grid-title">{monthName}</div>
      <div className="month-grid-header">
        {dayNames.map((d) => (
          <span key={d} className="month-grid-day-name">{d}</span>
        ))}
      </div>
      <div className="month-grid-body">
        {cells.map((day, i) =>
          day === null ? (
            <span key={`blank-${i}`} className="month-grid-cell empty" />
          ) : (
            <button
              key={day}
              type="button"
              className={`month-grid-cell${toDateStr(day) === selected ? ' selected' : ''}`}
              onClick={() => onSelect(toDateStr(day))}
            >
              {day}
            </button>
          )
        )}
      </div>
    </div>
  );
}
