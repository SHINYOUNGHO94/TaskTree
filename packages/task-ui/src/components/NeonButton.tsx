import { clsx, type ClassValue } from "clsx";
import { motion, HTMLMotionProps } from "framer-motion";
import { twMerge } from "tailwind-merge";

// Tailwindのクラスを結合するためのユーティリティ
const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

interface NeonButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "outline";
}

// NeonButton: ネオンエフェクトとインタラクションを持つプレミアムボタン
export const NeonButton = ({
  variant = "primary",
  children,
  className,
  ...props
}: NeonButtonProps) => {
  const variants = {
    primary: "bg-neon-cyan text-charcoal shadow-neon hover:bg-white",
    secondary: "bg-neon-purple text-white shadow-[0_0_15px_rgba(112,0,255,0.5)]",
    outline: "border border-white/20 bg-transparent text-white hover:bg-white/10",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center justify-center rounded-lg px-6 py-3 font-heading font-bold transition-all duration-300",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};
