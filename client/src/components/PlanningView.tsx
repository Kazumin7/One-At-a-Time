import { useState, useEffect } from 'react';
import type { Task } from '../types';
import {
  getTasksByDate,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  setDate,
} from '../api';
import TaskForm from './TaskForm';
import TaskList from './TaskList';
import DatePicker from './DatePicker';

interface PlanningViewProps {
  today: string;
  onDateChange?: (date: string) => void;
}

export default function PlanningView({ today, onDateChange }: PlanningViewProps) {
  const [planDate, setPlanDate] = useState(today);
  const [planTasks, setPlanTasks] = useState<Task[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleDateChange = async (date: string) => {
    setPlanDate(date);
    try {
      await setDate(date);
      onDateChange?.(date);
    } catch (err) {
      console.error('Failed to set date:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    getTasksByDate(planDate)
      .then((tasks) => {
        setPlanTasks(tasks);
      })
      .catch((err) => console.error('Failed to load tasks:', err))
      .finally(() => setLoading(false));
  }, [planDate]);

  const handleAddTask = async (data: {
    description: string;
    time_start?: string;
    time_end?: string;
    location?: string;
  }) => {
    setSubmitting(true);
    try {
      const task = await createTask({
        ...data,
        scheduled_date: planDate,
      });
      setPlanTasks((prev) => [...prev, task]);
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReorder = async (reordered: Task[]) => {
    setPlanTasks(reordered);
    try {
      await reorderTasks(reordered.map((t) => t.id));
    } catch (err) {
      console.error('Failed to reorder:', err);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTaskId(task.id);
  };

  const handleSaveEdit = async (
    id: number,
    data: { description?: string; time_start?: string; time_end?: string; location?: string }
  ) => {
    try {
      const updated = await updateTask(id, data);
      setPlanTasks((prev) =>
        prev.map((t) => (t.id === id ? updated : t))
      );
      setEditingTaskId(null);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTask(id);
      setPlanTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  if (loading) {
    return <div className="planning-view" />;
  }

  return (
    <div className="planning-view">
      <div className="planning-header">
        <h1>Chart Your Constellation</h1>
        <DatePicker
          value={planDate}
          onChange={handleDateChange}
          className="planning-date-picker"
        />
      </div>

      <TaskForm onSubmit={handleAddTask} disabled={submitting} />

      <TaskList
        tasks={planTasks}
        onReorder={handleReorder}
        onEdit={handleEdit}
        onDelete={handleDelete}
        editingTaskId={editingTaskId}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
      />
    </div>
  );
}
