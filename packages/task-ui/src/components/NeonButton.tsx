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

// NeonButton
export const NeonButton = ({
  variant = "primary",
  children,
  className,
  ...props
}: NeonButtonProps) => {
  const variants = {
    // 明るいテーマ用の洗練されたスタイル
    primary: "bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700",
    secondary: "bg-purple-600 text-white shadow-lg shadow-purple-100 hover:bg-purple-700",
    outline: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center justify-center rounded-xl px-6 py-3 font-heading font-bold transition-all duration-300",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};
