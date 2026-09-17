import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/** Know custom control heights so e.g. `h-7` correctly overrides `h-control-md`. */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      h: ["h-control-sm", "h-control-md"],
      "min-h": ["min-h-control-sm", "min-h-control-md"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const taskFieldStyles = "text-xs font-semibold text-slate-200 placeholder:text-slate-400 placeholder:font-medium";
