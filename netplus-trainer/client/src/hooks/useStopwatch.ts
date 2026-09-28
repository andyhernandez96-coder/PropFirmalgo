import { useEffect, useRef, useState } from 'react';

/** Counts active seconds; time spent paused is not counted. */
export function useStopwatch(paused: boolean): number {
  const [seconds, setSeconds] = useState(0);
  const accumulated = useRef(0);
  const runningSince = useRef<number | null>(paused ? null : Date.now());

  useEffect(() => {
    if (paused) {
      if (runningSince.current !== null) {
        accumulated.current += Date.now() - runningSince.current;
        runningSince.current = null;
      }
      setSeconds(Math.floor(accumulated.current / 1000));
      return;
    }
    runningSince.current = Date.now();
    const tick = () => {
      const running = runningSince.current === null ? 0 : Date.now() - runningSince.current;
      setSeconds(Math.floor((accumulated.current + running) / 1000));
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [paused]);

  return seconds;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}
