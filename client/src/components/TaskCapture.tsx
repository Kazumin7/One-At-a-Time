import { useState, useRef, useEffect, type FormEvent } from 'react';
import DatePicker from './DatePicker';

interface TaskCaptureProps {
  defaultDate: string;
  onCapture: (description: string, date: string) => void;
}

// ─── Void particle trail ───
function useVoidTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; alpha: number; hue: number }[]>([]);
  const animRef = useRef<number>(0);

  const emit = (originX: number, originY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create particles that stream upward from origin
    const newParticles = Array.from({ length: 18 }, (_, i) => {
      const spread = (Math.random() - 0.5) * 60;
      return {
        x: originX + spread,
        y: originY - i * 3,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(Math.random() * 2.5 + 1.5),
        r: Math.random() * 2.5 + 0.8,
        alpha: Math.random() * 0.6 + 0.4,
        hue: Math.random() > 0.5 ? 260 : 190, // purple or cyan
      };
    });

    particlesRef.current = [...particlesRef.current, ...newParticles];

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particlesRef.current) {
        if (p.alpha <= 0) continue;
        alive = true;

        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.02; // accelerate upward
        p.alpha -= 0.012;

        // Main dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${Math.max(0, p.alpha)})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${Math.max(0, p.alpha * 0.12)})`;
        ctx.fill();
      }

      // Clean dead particles
      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);

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

  return { canvasRef, emit };
}

interface VoidGhost {
  id: number;
  text: string;
  x: number;
  y: number;
}

let ghostIdCounter = 0;

export default function TaskCapture({ defaultDate, onCapture }: TaskCaptureProps) {
  const [value, setValue] = useState('');
  const [targetDate, setTargetDate] = useState(defaultDate);
  const [ghosts, setGhosts] = useState<VoidGhost[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { canvasRef, emit } = useVoidTrail();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    // Get position of the input for the ghost origin
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;

      // Spawn ghost text that floats into void
      const ghost: VoidGhost = {
        id: ++ghostIdCounter,
        text: trimmed,
        x: originX,
        y: originY,
      };
      setGhosts(prev => [...prev, ghost]);

      // Fire particle trail
      emit(originX, originY);

      // Remove ghost after animation completes
      setTimeout(() => {
        setGhosts(prev => prev.filter(g => g.id !== ghost.id));
      }, 900);
    }

    onCapture(trimmed, targetDate);
    setValue('');
    setTargetDate(defaultDate);
  };

  const formatShortDate = (dateStr: string) => {
    if (dateStr === defaultDate) return 'Tomorrow';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Particle trail canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 60,
          pointerEvents: 'none',
        }}
      />

      {/* Ghost text elements that float into the void */}
      {ghosts.map(ghost => (
        <div
          key={ghost.id}
          className="void-ghost-text"
          style={{
            position: 'fixed',
            left: ghost.x,
            top: ghost.y,
            zIndex: 55,
          }}
        >
          {ghost.text}
        </div>
      ))}

      <form className="task-capture-form" onSubmit={handleSubmit} ref={formRef}>
        <div className="task-capture-row">
          <input
            ref={inputRef}
            type="text"
            className="task-capture-input"
            placeholder="Feed a task into the void..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
          />
          <DatePicker
            value={targetDate}
            onChange={setTargetDate}
            displayFormat={formatShortDate}
            className="task-capture-date-picker"
          />
          {value.trim() && (
            <button type="submit" className="task-capture-submit" aria-label="Send to void">
              ↑
            </button>
          )}
        </div>
      </form>
    </>
  );
}
