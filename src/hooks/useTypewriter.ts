import { useEffect, useRef, useState } from 'react';

/**
 * Reveals `target` string character by character at `speed` ms/char.
 * - Automatically catches up if streaming is faster than the display speed.
 * - Resets to 0 when `target` becomes empty (new message started).
 */
export function useTypewriter(target: string, speed = 15): string {
  const [len, setLen] = useState(0);
  const targetRef = useRef(target);

  // Keep ref in sync; reset position when target is cleared
  useEffect(() => {
    targetRef.current = target;
    if (!target) setLen(0);
  }, [target]);

  // Advance character position towards target length
  useEffect(() => {
    const t = targetRef.current;
    if (len >= t.length) return;

    const lag = t.length - len;
    // Speed up typing when falling behind (prevents post-stream lag)
    const delay = lag > 80 ? 3 : speed;
    const step = lag > 300 ? 12 : lag > 80 ? 3 : 1;

    const id = setTimeout(() => {
      setLen(prev => Math.min(prev + step, targetRef.current.length));
    }, delay);

    return () => clearTimeout(id);
  }, [len, target, speed]);

  return target.slice(0, len);
}
