import { useState } from 'react';
import { startDay } from '../api';

interface StartDayButtonProps {
  onDayStarted: () => void;
}

export default function StartDayButton({ onDayStarted }: StartDayButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await startDay();
      onDayStarted();
    } catch (err) {
      console.error('Failed to start day:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="start-day-button"
      onClick={handleStart}
      disabled={loading}
    >
      {loading ? 'Launching…' : 'Launch Day ✦'}
    </button>
  );
}
