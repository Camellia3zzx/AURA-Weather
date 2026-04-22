import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../lib/utils';

interface Props extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const GlassCard: React.FC<Props> = ({ children, className, delay = 0, ...props }) => {
  return (
    <motion.div
      {...props}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-xl",
        className
      )}
    >
      {children}
    </motion.div>
  );
};
