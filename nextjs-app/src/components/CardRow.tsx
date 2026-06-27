"use client";

import { ReactNode } from "react";

interface CardRowProps {
  children: ReactNode;
  id?: string;
}

/**
 * Groups child cards into a responsive CSS grid row.
 * Matches the original `.card-row` layout: 3 columns → 2 → 1.
 */
export default function CardRow({ children, id }: CardRowProps) {
  return (
    <div
      id={id}
      className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
    >
      {children}
    </div>
  );
}
