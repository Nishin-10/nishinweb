"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Soft page transition applied to every route change. */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.21, 0.62, 0.35, 1] }}
    >
      {children}
    </motion.div>
  );
}
