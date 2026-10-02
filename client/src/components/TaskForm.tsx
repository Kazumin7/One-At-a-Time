import { useState, type FormEvent } from 'react';

interface TaskFormData {
  description: string;
  time_start?: string;
  time_end?: string;
  location?: string;
}

interface TaskFormProps {
  onSubmit: (data: TaskFormData) => void;
  initialValues?: Partial<TaskFormData>;
  onCancel?: () => void;
  submitLabel?: string;
  disabled?: boolean;
}

export default function TaskForm({
  onSubmit,
  initialValues,
  onCancel,
  submitLabel = 'Add Task',
  disabled = false,
}: TaskFormProps) {
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [timeStart, setTimeStart] = useState(initialValues?.time_start ?? '');
  const [timeEnd, setTimeEnd] = useState(initialValues?.time_end ?? '');
  const [location, setLocation] = useState(initialValues?.location ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();
    if (!trimmed) return;

    onSubmit({
      description: trimmed,
      time_start: timeStart || undefined,
      time_end: timeEnd || undefined,
      location: location.trim() || undefined,
    });

    // Clear form if not in edit mode
    if (!initialValues) {
      setDescription('');
      setTimeStart('');
      setTimeEnd('');
      setLocation('');
    }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <input
          type="text"
          placeholder="What enters the orbit?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoComplete="off"
          required
        />
      </div>
      <div className="form-row time-row">
        <input
          type="time"
          step="300"
          value={timeStart}
          onChange={(e) => setTimeStart(e.target.value)}
          aria-label="Start time"
        />
        <span className="time-separator">to</span>
        <input
          type="time"
          step="300"
          value={timeEnd}
          onChange={(e) => setTimeEnd(e.target.value)}
          aria-label="End time"
        />
      </div>
      <div className="form-row">
        <input
          type="text"
          placeholder="Coordinates (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={disabled || !description.trim()}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
