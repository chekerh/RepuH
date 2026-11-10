"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Section entrance. Motion is decoration here: with reduced motion the content
 * renders immediately at its final position.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  // min-w-0 lets a grid item shrink to its column even when it contains a
  // wide table; without it the table sets the grid's minimum width and the
  // page scrolls sideways on narrow screens.
  const classes = cn("min-w-0", className);
  if (reduced) return <div className={classes}>{children}</div>;
  return (
    <motion.div
      className={classes}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.42, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
