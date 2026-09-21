import * as React from "react"
import { Pencil } from "lucide-react"

import { cn } from "@/lib/utils"
import { FIELD_TEXT_STYLE } from "@/lib/fieldStyles"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, maxLength, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [modalValue, setModalValue] = React.useState("")
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

  const setRefs = React.useCallback(
    (node: HTMLTextAreaElement) => {
      innerRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
      }
    },
    [ref]
  )

  const handleOpen = () => {
    if (innerRef.current) {
      setModalValue(innerRef.current.value)
    } else if (props.value !== undefined) {
      setModalValue(String(props.value))
    } else if (props.defaultValue !== undefined) {
      setModalValue(String(props.defaultValue))
    }
    setIsOpen(true)
  }

  const handleSave = () => {
    if (innerRef.current) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
      nativeInputValueSetter?.call(innerRef.current, modalValue);
      const event = new Event('input', { bubbles: true });
      innerRef.current.dispatchEvent(event);
      
      // trigger native onChange for standard controlled components
      if (props.onChange) {
        // Construct a synthetic event approximation if needed, 
        // though native event usually triggers React's synthetic system properly
      }
    }
    setIsOpen(false)
  }

  return (
    <div className="relative w-full flex">
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-tm-border bg-tm-input px-3 py-2 pr-10 text-base shadow-tm-control ring-offset-background placeholder:text-tm-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:border-brand focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
          FIELD_TEXT_STYLE,
          "rounded-md resize-none",
          !(typeof className === "string" && /border-red/.test(className)) && "!border-tm-border"
        )}
        ref={setRefs}
        maxLength={maxLength}
        {...props}
      />
      {!props.disabled && (
        <button
          type="button"
          onClick={handleOpen}
          className="absolute right-2 top-2 h-6 w-6 inline-flex items-center justify-center rounded-[6px] text-slate-400 hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/10 transition-colors bg-[var(--tm-surface)]/80 backdrop-blur-sm shadow-sm border border-[var(--tm-border)]/50"
          title="Expand for large text"
        >
          <Pencil size={12} />
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] border-[var(--tm-border)] bg-[var(--tm-surface)]">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Edit Text</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <textarea
              value={modalValue}
              onChange={(e) => setModalValue(e.target.value)}
              maxLength={maxLength}
              className={cn(
                "flex w-full rounded-md border border-tm-border bg-tm-input px-3 py-2 text-base shadow-tm-control ring-offset-background placeholder:text-tm-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:border-brand focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                FIELD_TEXT_STYLE,
                "min-h-[250px] resize-y"
              )}
              placeholder={props.placeholder || "Enter text here..."}
              autoFocus
            />
            {maxLength && (
              <p className="text-[11px] text-right text-slate-400 mt-2 font-medium">
                {modalValue.length} / {maxLength}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} className="rounded-[6px] h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="rounded-[6px] bg-[#0EA5E9] hover:bg-[#0284c7] text-white h-8 text-xs shadow-sm">
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
