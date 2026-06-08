import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const taskFieldStyles = "text-xs font-semibold text-slate-700 placeholder:text-slate-400 placeholder:font-medium";
