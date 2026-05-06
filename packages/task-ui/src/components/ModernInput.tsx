import React, { forwardRef } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

export const ModernInput = forwardRef<HTMLInputElement, ModernInputProps>(
  ({ label, icon, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-white/70 font-heading ml-1 mb-2">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 text-white/30 transition-colors duration-300 z-10",
              "group-focus-within:text-neon-cyan",
              error && "text-red-400"
            )}>
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 outline-none transition-all duration-300 relative",
              "focus:border-neon-cyan/50 focus:ring-4 focus:ring-neon-cyan/10",
              "placeholder:text-white/20 text-white text-base font-body",
              icon && "pl-12",
              error && "border-red-500/50 focus:border-red-500/80 focus:ring-red-500/10",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 ml-1 text-xs text-red-400/90 font-body transition-all duration-300">
            {error}
          </p>
        )}
      </div>
    );
  }
);

ModernInput.displayName = "ModernInput";
