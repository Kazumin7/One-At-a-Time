import { useState } from 'react';
import { endDay } from '../api';

interface EndDayButtonProps {
  onDayEnded: () => void;
  hasRemainingTasks?: boolean;
}

export default function EndDayButton({ onDayEnded, hasRemainingTasks = false }: EndDayButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await endDay();
      setConfirming(false);
      onDayEnded();
    } catch (err) {
      console.error('Failed to end day:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (hasRemainingTasks) {
      setConfirming(true);
    } else {
      handleConfirm();
    }
  };

  if (confirming) {
    return (
      <div className="end-day-confirm">
        <p>Enter the void? Unfinished tasks will drift forward to tomorrow.</p>
        <div className="end-day-confirm-actions">
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Entering void…' : 'Yes, end day'}
          </button>
          <button
            className="btn-ghost"
            onClick={() => setConfirming(false)}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button className="end-day-button" onClick={handleClick} disabled={loading}>
      {loading ? 'Ending…' : 'End Day ☾'}
    </button>
  );
}
