import { useState, useEffect, useCallback, useRef } from 'react';
import { getMode } from './api';
import type { Mode } from './types';
import FocusView from './components/FocusView';
import PlanningView from './components/PlanningView';
import EndDayButton from './components/EndDayButton';
import StartDayButton from './components/StartDayButton';
import CalendarView from './components/CalendarView';

export const APP_VERSION = 'v1.1.0.0';

// ─── Star color palette (r, g, b) ───
const STAR_COLORS: [number, number, number][] = [
  [200, 190, 255],   // cool lavender (most common)
  [200, 190, 255],
  [200, 190, 255],
  [180, 220, 255],   // icy blue
  [255, 210, 180],   // warm peach
  [160, 240, 230],   // cyan-teal
  [230, 200, 255],   // soft violet
  [255, 235, 200],   // pale gold
];

// ─── Starfield Background ───
function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    // ── Star type ──
    interface Star {
      x: number; y: number; r: number;
      opacity: number; speed: number;
      twinkleSpeed: number; twinkleOffset: number;
      color: [number, number, number];
      layer: number;           // 0 = far, 1 = mid, 2 = near
      pulsePhase: number;      // for occasional bright pulse
    }

    // ── Shooting star type ──
    interface ShootingStar {
      x: number; y: number;
      vx: number; vy: number;
      life: number; maxLife: number;
      length: number;
      width: number;
    }

    let stars: Star[] = [];
    let shootingStars: ShootingStar[] = [];
    let nextShootingStarTime = 100 + Math.random() * 200;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      const count = Math.floor((canvas.width * canvas.height) / 3500);
      stars = Array.from({ length: count }, () => {
        const layer = Math.random() < 0.6 ? 0 : Math.random() < 0.7 ? 1 : 2;
        const layerScale = [0.4, 0.7, 1.0][layer];
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: (Math.random() * 1.5 + 0.3) * layerScale,
          opacity: (Math.random() * 0.55 + 0.25) * layerScale,
          speed: (Math.random() * 0.06 + 0.008) * layerScale,
          twinkleSpeed: Math.random() * 0.015 + 0.003,
          twinkleOffset: Math.random() * Math.PI * 2,
          color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
          layer,
          pulsePhase: Math.random() * Math.PI * 2,
        };
      });
    };

    const spawnShootingStar = () => {
      const startX = Math.random() * canvas.width * 0.8;
      const startY = Math.random() * canvas.height * 0.4;
      const angle = (Math.PI / 6) + Math.random() * (Math.PI / 6); // 30°–60° downward-right
      const speed = 5 + Math.random() * 7;
      shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 45 + Math.random() * 35,
        length: 80 + Math.random() * 100,
        width: 1.5 + Math.random() * 1.0,
      });
    };

    let time = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 1;

      // ── Draw stars by layer (far → near) for depth ──
      for (const star of stars) {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.35 + 0.65;

        // Occasional bright pulse on random stars
        const pulse = Math.pow(Math.max(0, Math.sin(time * 0.003 + star.pulsePhase)), 20) * 0.6;

        const alpha = Math.min(1, star.opacity * twinkle + pulse);

        // Parallax drift — nearer layers drift faster
        star.y -= star.speed;
        star.x -= star.speed * 0.15; // slight lateral drift
        if (star.y < -2) {
          star.y = canvas.height + 2;
          star.x = Math.random() * canvas.width;
        }
        if (star.x < -2) {
          star.x = canvas.width + 2;
        }

        const [cr, cg, cb] = star.color;

        // Star core
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
        ctx.fill();

        // Soft glow halo for mid + near stars
        if (star.r > 0.5) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.r * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha * 0.1})`;
          ctx.fill();
        }

        // Bright stars get a subtle cross-spike / diffraction
        if (star.r > 0.9 && alpha > 0.4) {
          const spikeLen = star.r * 5 * alpha;
          ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha * 0.3})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(star.x - spikeLen, star.y);
          ctx.lineTo(star.x + spikeLen, star.y);
          ctx.moveTo(star.x, star.y - spikeLen);
          ctx.lineTo(star.x, star.y + spikeLen);
          ctx.stroke();
        }
      }

      // ── Shooting stars ──
      if (time >= nextShootingStarTime) {
        spawnShootingStar();
        nextShootingStarTime = time + 180 + Math.random() * 400; // every 3–10 seconds at 60fps
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life += 1;

        const progress = s.life / s.maxLife;
        // Fade in quickly, fade out gently
        const alpha = progress < 0.15
          ? progress / 0.15
          : 1 - Math.pow((progress - 0.15) / 0.85, 0.6);

        if (alpha <= 0 || s.life >= s.maxLife) {
          shootingStars.splice(i, 1);
          continue;
        }

        // Tail end position
        const tailX = s.x - (s.vx / Math.sqrt(s.vx * s.vx + s.vy * s.vy)) * s.length * alpha;
        const tailY = s.y - (s.vy / Math.sqrt(s.vx * s.vx + s.vy * s.vy)) * s.length * alpha;

        // Gradient trail
        const gradient = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        gradient.addColorStop(0, `rgba(200, 190, 255, 0)`);
        gradient.addColorStop(0.5, `rgba(200, 200, 255, ${alpha * 0.45})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.95})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = s.width * alpha;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Bright head glow
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.width * 2.5 * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 220, 255, ${alpha * 0.55})`;
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield-canvas" />;
}

export default function App() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [today, setToday] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [pendingTaskCount, setPendingTaskCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await getMode();
      setMode(data.mode);
      setToday(data.today);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to fetch mode:', err);
      setLoadError('Could not connect to server. Retrying...');
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Auto-retry when loading the mode fails (e.g. server temporarily down)
  useEffect(() => {
    if (!mode && loadError) {
      const timer = setTimeout(() => refreshState(), 3000);
      return () => clearTimeout(timer);
    }
  }, [mode, loadError, refreshState]);

  const handleDateChange = useCallback((date: string) => {
    setToday(date);
  }, []);

  if (!mode || !today) {
    return (
      <>
        <Starfield />
        <div className="cosmic-gradient" />
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem', gap: '1rem' }}>
          {loadError ? (
            <>
              <div style={{ color: '#f87171', fontSize: '0.95rem' }}>{loadError}</div>
              <button
                onClick={refreshState}
                style={{
                  padding: '0.5rem 1.5rem',
                  borderRadius: '999px',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#c4b5fd',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </>
          ) : (
            <div>Loading...</div>
          )}
        </div>
        <div className="version-label">{APP_VERSION}</div>
      </>
    );
  }

  if (showCalendar) {
    return (
      <>
        <Starfield />
        <div className="cosmic-gradient" />
        <div className="container">
          <CalendarView today={today} onClose={() => setShowCalendar(false)} />
        </div>
        <div className="version-label">{APP_VERSION}</div>
      </>
    );
  }

  return (
    <>
      <Starfield />
      <div className="cosmic-gradient" />
      <div className="container">
        {mode === 'focus' ? (
          <FocusView key={refreshKey} today={today} onPendingCountChange={setPendingTaskCount} onDateChange={handleDateChange} />
        ) : (
          <PlanningView key={refreshKey} today={today} onDateChange={handleDateChange} />
        )}
        {mode === 'focus' ? (
          <EndDayButton onDayEnded={refreshState} hasRemainingTasks={pendingTaskCount > 0} />
        ) : (
          <StartDayButton onDayStarted={refreshState} />
        )}
        <button
          className="calendar-toggle-button"
          onClick={() => setShowCalendar(true)}
          title="View calendar"
        >
          &#x1f4c5;
        </button>
      </div>
      <div className="version-label">{APP_VERSION}</div>
    </>
  );
}
