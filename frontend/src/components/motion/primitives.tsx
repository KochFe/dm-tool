"use client";

import { motion, type HTMLMotionProps, type Variants } from "framer-motion";
import { type ReactNode } from "react";

const EASE_OUT_QUINT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_SPRING: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

type FadeInProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
} & Omit<HTMLMotionProps<"div">, "initial" | "animate" | "transition">;

export function FadeIn({
  children,
  delay = 0,
  y = 8,
  duration = 0.48,
  ...rest
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: EASE_OUT_QUINT, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const staggerChild: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT_QUINT } },
};

export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerParent}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerChild} className={className}>
      {children}
    </motion.div>
  );
}

export function HoverLift({
  children,
  className,
  lift = 4,
}: {
  children: ReactNode;
  className?: string;
  lift?: number;
}) {
  return (
    <motion.div
      whileHover={{ y: -lift }}
      transition={{ duration: 0.25, ease: EASE_OUT_QUINT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SpringPop({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE_SPRING }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
