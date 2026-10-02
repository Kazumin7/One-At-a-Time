import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';
import { formatTime, isJournalTask, getJournalDisplayText } from '../utils';
import TaskForm from './TaskForm';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  isEditing: boolean;
  onSaveEdit: (data: { description?: string; time_start?: string; time_end?: string; location?: string }) => void;
  onCancelEdit: () => void;
}

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  isEditing,
  onSaveEdit,
  onCancelEdit,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const timeDisplay = task.time_start
    ? task.time_end
      ? `${formatTime(task.time_start)} – ${formatTime(task.time_end)}`
      : formatTime(task.time_start)
    : null;

  const isJournal = isJournalTask(task.description);
  const displayText = isJournal ? getJournalDisplayText(task.description) : task.description;

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        <TaskForm
          initialValues={{
            description: task.description,
            time_start: task.time_start ?? '',
            time_end: task.time_end ?? '',
            location: task.location ?? '',
          }}
          onSubmit={onSaveEdit}
          onCancel={onCancelEdit}
          submitLabel="Save Changes"
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? 'dragging' : ''} ${isJournal ? 'journal-task' : ''}`}
    >
      <div className="drag-handle" {...attributes} {...listeners}>
        ⠿
      </div>
      <div className="task-card-content">
        <div className="task-card-description">
          {isJournal && <span className="journal-icon" title="Journal entry">✦</span>}
          {displayText}
        </div>
        {(timeDisplay || task.location) && (
          <div className="task-card-meta">
            {timeDisplay && <span>{timeDisplay}</span>}
            {timeDisplay && task.location && <span> · </span>}
            {task.location && <span>{task.location}</span>}
          </div>
        )}
      </div>
      <div className="task-card-actions">
        <button className="btn-icon" onClick={() => onEdit(task)} title="Edit">
          ✎
        </button>
        <button
          className="btn-icon danger"
          onClick={() => onDelete(task.id)}
          title="Delete"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
