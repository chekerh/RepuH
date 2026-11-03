"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

/** A container that reveals its children with a small stagger on scroll entry.
 *
 * The entrance is a single authored moment per section — rise plus opacity —
 * not a scatter of effects. Under `prefers-reduced-motion` children render at
 * full opacity with no transform, so the content is never hidden by timing.
 */
export function Reveal({
  children,
  className,
  as = "section",
  stagger = 0.06,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "ul" | "ol";
  stagger?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease, staggerChildren: stagger, delayChildren: 0.05 },
    },
  };

  const MotionTag = motion[as as keyof typeof motion] as typeof motion.section;

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial={reduce ? "show" : "hidden"}
      whileInView={reduce ? "show" : "show"}
      viewport={{ once, amount: 0.18 }}
    >
      {children}
    </MotionTag>
  );
}

export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "p" | "span";
}) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
  };

  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial={reduce ? "show" : "hidden"}
      whileInView={reduce ? "show" : "show"}
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </MotionTag>
  );
}