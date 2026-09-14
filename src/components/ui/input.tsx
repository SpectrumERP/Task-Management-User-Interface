import * as React from "react"

import { cn } from "@/lib/utils"
import { FIELD_TEXT_STYLE } from "@/lib/fieldStyles"

export interface InputProps extends React.ComponentProps<"input"> {
  isDecimal?: boolean;
  decimalPlaces?: number;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onWheel, onInput, onChange, maxLength, isDecimal = false, decimalPlaces = 2, ...props }, ref) => {
    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      if (type === "number") {
        e.currentTarget.blur();
      }
      if (onWheel) {
        onWheel(e);
      }
    };

    const handleNumericFormatting = (val: string): string => {
      if (!val) return val;

      if (val.includes('.')) {
        if (!isDecimal) {
          return val.split('.')[0];
        } else {
          const [intPart, decimalPart] = val.split('.');
          let processedInt = intPart;
          const max = maxLength !== undefined ? Number(maxLength) : -1;
          if (max > 0 && intPart.length > max) {
            processedInt = intPart.slice(0, max);
          }
          let processedDec = decimalPart;
          if (decimalPlaces !== undefined && decimalPlaces >= 0 && decimalPart.length > decimalPlaces) {
            processedDec = decimalPart.slice(0, decimalPlaces);
          }
          return `${processedInt}.${processedDec}`;
        }
      } else {
        const max = maxLength !== undefined ? Number(maxLength) : -1;
        if (max > 0 && val.length > max) {
          return val.slice(0, max);
        }
        return val;
      }
    };

    const handleInput = (e: React.InputEvent<HTMLInputElement>) => {
      if (type === "number") {
        const originalVal = e.currentTarget.value;
        const formattedVal = handleNumericFormatting(originalVal);
        if (originalVal !== formattedVal) {
          e.currentTarget.value = formattedVal;
        }
      }
      if (onInput) {
        onInput(e as any);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === "number") {
        const originalVal = e.target.value;
        const formattedVal = handleNumericFormatting(originalVal);
        if (originalVal !== formattedVal) {
          e.target.value = formattedVal;
        }
      }
      if (onChange) {
        onChange(e);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (type === "number") {
        // 1. Block scientific notation 'e' and 'E'
        if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          return;
        }

        // Allow standard control keys: Backspace, Tab, Enter, Escape, ArrowLeft, ArrowRight, Delete, etc.
        const isControlKey = [
          'Backspace', 'Tab', 'Enter', 'Escape',
          'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
          'Delete', 'Home', 'End'
        ].includes(e.key) || (e.ctrlKey || e.metaKey || e.altKey);

        if (isControlKey) {
          if (props.onKeyDown) props.onKeyDown(e);
          return;
        }

        // Validate characters
        const isDigit = /^[0-9]$/.test(e.key);
        const isDecimalSeparator = e.key === '.' || e.key === ',';

        if (isDecimal) {
          if (!isDigit && !isDecimalSeparator) {
            e.preventDefault();
            return;
          }
          // Prevent multiple dots/commas
          if (isDecimalSeparator && e.currentTarget.value.includes('.')) {
            e.preventDefault();
            return;
          }
        } else {
          if (!isDigit) {
            e.preventDefault();
            return;
          }
        }

        // 3. Block digits if maxLength is reached on integer part
        const max = maxLength !== undefined ? Number(maxLength) : -1;
        if (max > 0 && isDigit) {
          const val = e.currentTarget.value;
          const hasDot = val.includes('.');
          const selectionStart = e.currentTarget.selectionStart;
          const selectionEnd = e.currentTarget.selectionEnd;
          const hasSelection = selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd;

          if (!hasSelection) {
            if (!hasDot) {
              // No dot exists yet, they are typing in the integer part
              if (val.length >= max) {
                e.preventDefault();
                return;
              }
            } else {
              // A dot exists, restrict based on cursor location
              const dotIndex = val.indexOf('.');
              if (selectionStart !== null && selectionStart <= dotIndex) {
                // Typing in the integer part
                const intPart = val.split('.')[0];
                if (intPart.length >= max) {
                  e.preventDefault();
                  return;
                }
              } else if (selectionStart !== null && selectionStart > dotIndex) {
                // Typing in the decimal part
                const decimalPart = val.split('.')[1] || '';
                if (decimalPart.length >= decimalPlaces) {
                  e.preventDefault();
                  return;
                }
              }
            }
          }
        }
      }
      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
    };

    return (
      <input
        type={type === "number" ? "text" : type}
        inputMode={type === "number" ? (isDecimal ? "decimal" : "numeric") : undefined}
        pattern={type === "number" ? (isDecimal ? "[0-9]*[.,]?[0-9]*" : "[0-9]*") : undefined}
        maxLength={type !== "number" ? maxLength : undefined}
        className={cn(
          "flex h-10 w-full rounded-md border border-tm-border bg-tm-input px-3 py-2 text-base shadow-tm-control ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-tm-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:border-brand focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          type === "number" && "text-right",
          className,
          FIELD_TEXT_STYLE,
          "rounded-md",
          // Skip force-border when caller sets error or an explicit !border-* color
          !(typeof className === "string" && (/border-red/.test(className) || /!border-/.test(className))) &&
          "!border-tm-border"
        )}
        ref={ref}
        onWheel={handleWheel}
        onInput={handleInput}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
