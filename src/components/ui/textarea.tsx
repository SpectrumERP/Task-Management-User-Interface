import * as React from "react"

import { cn } from "@/lib/utils"
import { FIELD_TEXT_STYLE } from "@/lib/fieldStyles"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-tm-border bg-tm-input px-3 py-2 text-base shadow-tm-control ring-offset-background placeholder:text-tm-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:border-brand focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
        FIELD_TEXT_STYLE,
        "rounded-md resize-none",
        !(typeof className === "string" && /border-red/.test(className)) && "!border-tm-border"
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
