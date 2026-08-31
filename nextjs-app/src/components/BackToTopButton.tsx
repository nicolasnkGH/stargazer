"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full border border-sky-300/40 bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_25px_rgba(56,189,248,0.5)] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(56,189,248,0.8)] cursor-pointer active:scale-95 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      aria-label="Back to top"
      title="Back to top"
    >
      <Icon name="arrow-up" className="h-4 w-4 stroke-[3]" />
      <span>Top</span>
    </button>
  );
}
