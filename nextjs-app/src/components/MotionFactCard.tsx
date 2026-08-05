"use client";

import { useEffect, useState } from "react";
import { MOTION_FACTS, MOTION_FACT_ROTATE_INTERVAL_MS } from "@/lib/constants";
import type { MotionFactType } from "@/types";

export default function MotionFactCard({ type }: { type: MotionFactType }) {
  const facts = MOTION_FACTS[type];
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % facts.length);
        setVisible(true);
      }, 200);
    }, MOTION_FACT_ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [facts.length]);

  function goTo(i: number) {
    setVisible(false);
    setTimeout(() => {
      setIndex(i);
      setVisible(true);
    }, 200);
  }

  const fact = facts[index];

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className={`flex items-start gap-3 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}>
        <span className="text-2xl flex-shrink-0">{fact.icon}</span>
        <p className="text-xs text-zinc-300 leading-relaxed">{fact.text}</p>
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {facts.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Fact ${i + 1}`}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === index ? "bg-sky-400" : "bg-white/15 hover:bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
