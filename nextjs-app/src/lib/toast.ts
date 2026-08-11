"use client";

export type ToastState = { id: number; message: string } | null;

let current: ToastState = null;
let listeners: Array<() => void> = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let nextId = 0;

function notify() {
  listeners.forEach((l) => l());
}

export function showToast(message: string, durationMs = 3500) {
  current = { id: ++nextId, message };
  notify();
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    notify();
  }, durationMs);
}

export function getToast(): ToastState {
  return current;
}

export function subscribeToast(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
