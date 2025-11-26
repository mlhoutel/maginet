/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect } from "react";

interface RateLimitOptions {
  maxCalls: number;
  timeWindow: number; // in milliseconds
}

interface RateLimitedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
}

export function useRateLimit<T extends (...args: any[]) => any>(
  fn: T,
  { maxCalls, timeWindow }: RateLimitOptions
): {
  rateLimitedFn: RateLimitedFunction<T>;
  canCall: boolean;
  remainingCalls: number;
  resetTime: number | null;
} {
  const [canCall, setCanCall] = useState(true);
  const [remainingCalls, setRemainingCalls] = useState(maxCalls);
  const [resetTime, setResetTime] = useState<number | null>(null);
  const callsRef = useRef<number[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOldCalls = useCallback(() => {
    const now = Date.now();
    callsRef.current = callsRef.current.filter(
      (time) => now - time < timeWindow
    );
    setRemainingCalls(maxCalls - callsRef.current.length);
    setCanCall(callsRef.current.length < maxCalls);

    if (callsRef.current.length === 0) {
      setResetTime(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else {
      const oldestCall = callsRef.current[0];
      const timeToReset = oldestCall + timeWindow - now;
      setResetTime(now + timeToReset);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(clearOldCalls, timeToReset);
    }
  }, [maxCalls, timeWindow]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const rateLimitedFn: RateLimitedFunction<T> = useCallback(
    (...args: Parameters<T>) => {
      if (canCall) {
        const now = Date.now();
        callsRef.current.push(now);
        clearOldCalls();

        if (callsRef.current.length === maxCalls) {
          setCanCall(false);
        }

        return fn(...args);
      } else {
        console.warn("Rate limit exceeded. Try again later.");
        return undefined;
      }
    },
    [fn, canCall, clearOldCalls, maxCalls]
  );

  return { rateLimitedFn, canCall, remainingCalls, resetTime };
}
