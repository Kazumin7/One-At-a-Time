import { useState, useEffect, useRef } from 'react';
import { getCalendarCounts, getTasksByDate } from '../api';
import type { Task } from '../types';
import { formatTime } from '../utils';

interface CalendarViewProps {
  today: string;
  onClose: () => void;
}

function formatYMD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function CalendarView({ today, onClose }: CalendarViewProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [taskCache, setTaskCache] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);

  const todayDate = new Date(today + 'T12:00:00');
  const currentMonthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const nextMonthEnd = new Date(todayDate.getFullYear(), todayDate.getMonth() + 2, 0);

  const fromStr = formatYMD(currentMonthStart);
  const toStr = formatYMD(nextMonthEnd);

  useEffect(() => {
    getCalendarCounts(fromStr, toStr)
      .then(setCounts)
      .catch((err) => console.error('Failed to load calendar:', err))
      .finally(() => setLoading(false));
  }, [fromStr, toStr]);

  // Fetch tasks for a specific date on demand (cached)
  const fetchTasksForDate = async (date: string): Promise<Task[]> => {
    if (taskCache[date]) return taskCache[date];
    try {
      const tasks = await getTasksByDate(date);
      setTaskCache((prev) => ({ ...prev, [date]: tasks }));
      return tasks;
    } catch (err) {
      console.error('Failed to fetch tasks for', date, err);
      return [];
    }
  };

  const nextMonth = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 1);

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <h1>Star Chart</h1>
        <button className="btn-ghost" onClick={onClose}>
          &larr; Back
        </button>
      </div>
      {loading ? (
        <div />
      ) : (
        <div className="calendar-months">
          <CalendarMonth
            month={currentMonthStart}
            counts={counts}
            today={today}
            onFetchTasks={fetchTasksForDate}
            taskCache={taskCache}
          />
          <CalendarMonth
            month={nextMonth}
            counts={counts}
            today={today}
            onFetchTasks={fetchTasksForDate}
            taskCache={taskCache}
          />
        </div>
      )}
    </div>
  );
}

interface CalendarMonthProps {
  month: Date;
  counts: Record<string, number>;
  today: string;
  onFetchTasks: (date: string) => Promise<Task[]>;
  taskCache: Record<string, Task[]>;
}

function CalendarMonth({ month, counts, today, onFetchTasks, taskCache }: CalendarMonthProps) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const title = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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
    <div className="calendar-month">
      <div className="calendar-month-title">{title}</div>
      <div className="calendar-grid-header">
        {dayNames.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="calendar-grid-body">
        {cells.map((day, i) => {
          if (day === null) {
            return <span key={`blank-${i}`} className="calendar-cell empty" />;
          }
          const dateStr = toDateStr(day);
          const count = counts[dateStr] || 0;
          const isToday = dateStr === today;
          return (
            <CalendarCell
              key={day}
              day={day}
              dateStr={dateStr}
              count={count}
              isToday={isToday}
              onFetchTasks={onFetchTasks}
              cachedTasks={taskCache[dateStr]}
            />
          );
        })}
      </div>
    </div>
  );
}

interface CalendarCellProps {
  day: number;
  dateStr: string;
  count: number;
  isToday: boolean;
  onFetchTasks: (date: string) => Promise<Task[]>;
  cachedTasks?: Task[];
}

function CalendarCell({ day, dateStr, count, isToday, onFetchTasks, cachedTasks }: CalendarCellProps) {
  const [hovered, setHovered] = useState(false);
  const [tasks, setTasks] = useState<Task[] | null>(cachedTasks ?? null);
  const [tooltipSide, setTooltipSide] = useState<'left' | 'right'>('right');
  const cellRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<number>(0);

  const handleMouseEnter = () => {
    if (count === 0) return;

    // Determine which side to show tooltip based on cell position
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      const viewportMid = window.innerWidth / 2;
      setTooltipSide(rect.left > viewportMid ? 'left' : 'right');
    }

    hoverTimeoutRef.current = window.setTimeout(async () => {
      setHovered(true);
      if (!tasks) {
        const fetched = await onFetchTasks(dateStr);
        setTasks(fetched);
      }
    }, 200); // Small delay to avoid flickering on quick mouse-overs
  };

  const handleMouseLeave = () => {
    window.clearTimeout(hoverTimeoutRef.current);
    setHovered(false);
  };

  // Update tasks if cache changes
  useEffect(() => {
    if (cachedTasks) setTasks(cachedTasks);
  }, [cachedTasks]);

  return (
    <div
      ref={cellRef}
      className={`calendar-cell${isToday ? ' today' : ''}${count > 0 ? ' has-tasks' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="calendar-cell-day">{day}</span>
      {count > 0 && <span className="calendar-cell-badge">{count}</span>}

      {hovered && count > 0 && (
        <div className={`calendar-tooltip ${tooltipSide === 'left' ? 'tooltip-left' : 'tooltip-right'}`}>
          <div className="calendar-tooltip-header">
            {new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <ul className="calendar-tooltip-list">
            {tasks ? (
              tasks.length > 0 ? (
                tasks.map((task) => (
                  <li key={task.id} className="calendar-tooltip-item">
                    <span className="calendar-tooltip-dot" />
                    <div className="calendar-tooltip-task">
                      <span className="calendar-tooltip-desc">{task.description}</span>
                      {task.time_start && (
                        <span className="calendar-tooltip-time">
                          {formatTime(task.time_start)}
                          {task.time_end && ` – ${formatTime(task.time_end)}`}
                        </span>
                      )}
                    </div>
                  </li>
                ))
              ) : (
                <li className="calendar-tooltip-empty">No tasks</li>
              )
            ) : (
              <li className="calendar-tooltip-loading">Loading…</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
