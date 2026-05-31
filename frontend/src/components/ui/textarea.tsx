import * as React from "react"

import { cn } from "@/lib/utils"

type TextareaVariant = "default" | "muted"

export interface TextareaProps
  extends React.ComponentProps<"textarea"> {
  variant?: TextareaVariant
  minRows?: number
}

const MIN_ROW_HEIGHT: Record<number, string> = {
  2: "min-h-16",
  3: "min-h-20",
  4: "min-h-24",
  5: "min-h-28",
  6: "min-h-32",
}

const VARIANT_CLS: Record<TextareaVariant, string> = {
  default:
    "bg-transparent dark:bg-input/30 disabled:bg-input/50 dark:disabled:bg-input/80",
  muted:
    "bg-muted resize-none",
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { className, variant = "default", minRows, onInput, value, ...props },
    forwardedRef
  ) {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

    const setRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node
        if (typeof forwardedRef === "function") forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      },
      [forwardedRef]
    )

    const resize = React.useCallback(() => {
      const el = innerRef.current
      if (!el) return
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
    }, [])

    React.useLayoutEffect(() => {
      resize()
    }, [value, resize])

    const handleInput: React.ComponentProps<"textarea">["onInput"] = (e) => {
      resize()
      onInput?.(e)
    }

    const minRowsCls =
      minRows && MIN_ROW_HEIGHT[minRows] ? MIN_ROW_HEIGHT[minRows] : "min-h-16"

    return (
      <textarea
        ref={setRef}
        data-slot="textarea"
        value={value}
        onInput={handleInput}
        className={cn(
          "flex field-sizing-content w-full rounded-lg border border-input px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 overflow-hidden",
          VARIANT_CLS[variant],
          minRowsCls,
          className
        )}
        {...props}
      />
    )
  }
)

export { Textarea }
