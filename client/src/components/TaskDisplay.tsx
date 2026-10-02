import type { Task } from '../types';
import { formatTime, isJournalTask, getJournalDisplayText } from '../utils';

interface TaskDisplayProps {
  task: Task;
}

export default function TaskDisplay({ task }: TaskDisplayProps) {
  const timeDisplay = task.time_start
    ? task.time_end
      ? `${formatTime(task.time_start)} – ${formatTime(task.time_end)}`
      : formatTime(task.time_start)
    : null;

  const isJournal = isJournalTask(task.description);
  const displayText = isJournal ? getJournalDisplayText(task.description) : task.description;

  return (
    <div className={`task-display fade-in ${isJournal ? 'journal-task' : ''}`} key={task.id}>
      <h1 className="task-description">
        {isJournal && <span className="journal-icon" title="Journal entry">✦</span>}
        {displayText}
      </h1>
      {timeDisplay && <div className="task-time">{timeDisplay}</div>}
      {task.location && <div className="task-location">{task.location}</div>}
    </div>
  );
}
