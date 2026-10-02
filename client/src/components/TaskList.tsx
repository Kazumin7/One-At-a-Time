import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import type { Task } from '../types';
import TaskCard from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  onReorder: (tasks: Task[]) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  editingTaskId: number | null;
  onSaveEdit: (id: number, data: { description?: string; time_start?: string; time_end?: string; location?: string }) => void;
  onCancelEdit: () => void;
}

export default function TaskList({
  tasks,
  onReorder,
  onEdit,
  onDelete,
  editingTaskId,
  onSaveEdit,
  onCancelEdit,
}: TaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const newTasks = arrayMove(tasks, oldIndex, newIndex);
    onReorder(newTasks);
  };

  if (tasks.length === 0) {
    return (
      <div className="task-list-empty">
        No stars charted yet. Plot your first task above.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              isEditing={editingTaskId === task.id}
              onSaveEdit={(data) => onSaveEdit(task.id, data)}
              onCancelEdit={onCancelEdit}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
