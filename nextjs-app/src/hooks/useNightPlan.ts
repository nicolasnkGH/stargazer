"use client";

import { useEffect, useState } from "react";
import { PLAN_NIGHT_STORAGE_KEY } from "@/lib/constants";
import type { PlanEntry } from "@/types";

function formatTime(h: number): string {
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:00 ${period}`;
}

function recomputeSlots(plan: PlanEntry[]): PlanEntry[] {
  const currentHour = new Date().getHours();
  const initialHour = currentHour >= 20 ? currentHour : 20;
  let runningHour = initialHour;
  return plan.map((item) => {
    const startHour = runningHour;
    const endHour = (startHour + 1) % 24;
    runningHour = endHour;
    return { ...item, startHour, endHour, startTime: formatTime(startHour), endTime: formatTime(endHour) };
  });
}

function readPlan(): PlanEntry[] {
  try {
    const raw = localStorage.getItem(PLAN_NIGHT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

let listeners: Array<() => void> = [];

function writePlan(plan: PlanEntry[]) {
  localStorage.setItem(PLAN_NIGHT_STORAGE_KEY, JSON.stringify(plan));
  listeners.forEach((l) => l());
}

/** Returns null on success, or a user-facing message if the target is already planned. */
export function addToPlan(id: string, name: string, ra = 0, dec = 0): string | null {
  const normId = String(id || name || "target").trim().toLowerCase().replace(/\s+/g, "_");
  const plan = readPlan();
  if (plan.some((item) => item.id.toLowerCase() === normId)) {
    return `${name} is already in your night plan!`;
  }
  const currentHour = new Date().getHours();
  const initialHour = currentHour >= 20 ? currentHour : 20;
  const startHour = plan.length > 0 ? plan[plan.length - 1].endHour : initialHour;
  const endHour = (startHour + 1) % 24;
  const entry: PlanEntry = { id: normId, name, ra, dec, startHour, endHour, startTime: formatTime(startHour), endTime: formatTime(endHour) };
  writePlan([...plan, entry]);
  return null;
}

export function removeFromPlan(index: number) {
  const plan = readPlan();
  plan.splice(index, 1);
  writePlan(recomputeSlots(plan));
}

export function movePlanItem(index: number, direction: "up" | "down") {
  const plan = readPlan();
  if (direction === "up" && index > 0) {
    [plan[index], plan[index - 1]] = [plan[index - 1], plan[index]];
  } else if (direction === "down" && index < plan.length - 1) {
    [plan[index], plan[index + 1]] = [plan[index + 1], plan[index]];
  }
  writePlan(recomputeSlots(plan));
}

export function clearPlan() {
  writePlan([]);
}

/** Live-reads the plan and re-renders whenever any component mutates it (add/remove/move/clear). */
export function useNightPlan(): PlanEntry[] {
  const [plan, setPlan] = useState<PlanEntry[]>([]);

  useEffect(() => {
    function load() {
      setPlan(readPlan());
    }
    load();
    listeners.push(load);
    return () => {
      listeners = listeners.filter((l) => l !== load);
    };
  }, []);

  return plan;
}
