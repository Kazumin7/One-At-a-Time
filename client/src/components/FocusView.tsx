import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task } from '../types';
import { getTasksByDate, completeTask, createTask, setDate } from '../api';
import { addOneDay } from '../utils';
import TaskCapture from './TaskCapture';
import TaskDisplay from './TaskDisplay';
import DatePicker from './DatePicker';

interface FocusViewProps {
  today: string;
  onPendingCountChange?: (count: number) => void;
  onDateChange?: (date: string) => void;
}

// ─── Particle burst on task completion ───
function useCompletionParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string; decay: number }[]>([]);
  const animRef = useRef<number>(0);

  const burst = (originX: number, originY: number) => {
    const colors = ['#8b5cf6', '#06b6d4', '#34d399', '#ec4899', '#f59e0b'];
    const particles = Array.from({ length: 28 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        r: Math.random() * 3 + 1,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        decay: Math.random() * 0.015 + 0.008,
      };
    });
    particlesRef.current = particles;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particlesRef.current) {
        if (p.alpha <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04; // gentle gravity
        p.alpha -= p.decay;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(')', `, ${Math.max(0, p.alpha)})`).replace('rgb', 'rgba').replace('#', '');
        // Convert hex to rgba
        const hex = p.color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0, p.alpha)})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0, p.alpha * 0.15)})`;
        ctx.fill();
      }

      if (alive) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    cancelAnimationFrame(animRef.current);
    animate();
  };

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return { canvasRef, burst };
}

export default function FocusView({ today, onPendingCountChange, onDateChange }: FocusViewProps) {
  const [selectedDate, setSelectedDate] = useState(today);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const { canvasRef, burst } = useCompletionParticles();

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    try {
      await setDate(date);
      onDateChange?.(date);
    } catch (err) {
      console.error('Failed to set date:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    getTasksByDate(selectedDate)
      .then(setTasks)
      .catch((err) => console.error('Failed to load tasks:', err))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const pendingTasks = tasks;
  const currentTask = pendingTasks[0] ?? null;

  const stableOnPendingCountChange = useCallback(
    (count: number) => onPendingCountChange?.(count),
    [onPendingCountChange]
  );

  useEffect(() => {
    stableOnPendingCountChange(pendingTasks.length);
  }, [pendingTasks.length, stableOnPendingCountChange]);

  const tomorrow = addOneDay(selectedDate);

  const handleCapture = async (description: string, date: string) => {
    try {
      await createTask({
        description,
        scheduled_date: date,
      });
    } catch (err) {
      console.error('Failed to capture task:', err);
    }
  };

  const handleComplete = async () => {
    if (!currentTask || completing) return;

    // Fire particle burst from center of viewport
    burst(window.innerWidth / 2, window.innerHeight * 0.4);
    setTransitioning(true);

    // Wait for send-to-void animation
    setTimeout(async () => {
      setCompleting(true);
      try {
        await completeTask(currentTask.id);
        setTasks((prev) => prev.filter((t) => t.id !== currentTask.id));
      } catch (err) {
        console.error('Failed to complete task:', err);
      } finally {
        setCompleting(false);
        setTransitioning(false);
      }
    }, 450);
  };

  if (loading) {
    return <div className="focus-view" />;
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 50,
          pointerEvents: 'none',
        }}
      />
      <div className="focus-view">
        <div className="focus-header">
          <DatePicker
            value={selectedDate}
            onChange={handleDateChange}
            className="focus-date-picker"
          />
        </div>

        <TaskCapture defaultDate={tomorrow} onCapture={handleCapture} />

        {tasks.length === 0 ? (
          <div className="task-display">
            <p className="empty-message">The void is clear. No tasks orbit this day.</p>
          </div>
        ) : pendingTasks.length === 0 ? (
          <div className="task-display fade-in">
            <p className="done-message">All tasks complete!</p>
          </div>
        ) : currentTask ? (
          <>
            <div className={transitioning ? 'fade-out' : ''}>
              <TaskDisplay task={currentTask} />
            </div>
            <button
              className="complete-btn"
              onClick={handleComplete}
              disabled={completing || transitioning}
            >
              {completing ? 'Sending to void…' : 'Complete ✦'}
            </button>
          </>
        ) : null}
      </div>
    </>
  );
}
