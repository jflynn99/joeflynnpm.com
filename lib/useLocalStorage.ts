"use client";

import { useCallback, useSyncExternalStore } from "react";

// Reading localStorage during render breaks hydration (the server has none),
// and reading it in an effect then calling setState costs an extra render.
// useSyncExternalStore is React's built-in answer: the server and the first
// client render get the fallback, then React swaps in the real value.

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // "storage" fires when another tab writes, so tabs stay in step.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or a full quota: carry on without persistence.
  }
  listeners.forEach((notify) => notify());
}

/** The stored string for `key`, or null on the server and when unset. */
export function useLocalStorage(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null
  );
}

const noopSubscribe = () => () => {};

/** False on the server and during hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

function countToday(stored: string | null): number {
  if (!stored) return 0;
  try {
    const { count, date } = JSON.parse(stored);
    return date === new Date().toDateString() ? count : 0;
  } catch {
    return 0;
  }
}

/**
 * Client-side daily counter for the public chats. It is a courtesy so the
 * visitor sees their limit up front; the server enforces the real one.
 */
export function useDailyQuota(key: string, max: number) {
  const used = countToday(useLocalStorage(key));

  const increment = useCallback(() => {
    writeLocalStorage(
      key,
      JSON.stringify({
        count: countToday(read(key)) + 1,
        date: new Date().toDateString(),
      })
    );
  }, [key]);

  return { limitHit: used >= max, increment };
}
