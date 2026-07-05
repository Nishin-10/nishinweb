"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Soft page transition applied to every route change. */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12, scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.34, ease: [0.21, 0.62, 0.35, 1] }}
    >
      {children}
    </motion.div>
  );
}
