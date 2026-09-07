import * as React from "react"
import { cn } from "@/lib/utils"

interface SciFiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: "purple" | "violet" | "fuchsia" | "emerald" | "blue" | "orange"
  glow?: boolean
}

const colorMap = {
  purple: {
    base: "border-purple-200 dark:border-purple-500/25 bg-white/40 dark:bg-purple-950/30",
    gradient: "via-purple-500/30 dark:via-purple-400/60",
  },
  violet: {
    base: "border-violet-200 dark:border-violet-500/25 bg-white/40 dark:bg-violet-950/30",
    gradient: "via-violet-500/30 dark:via-violet-400/60",
  },
  fuchsia: {
    base: "border-fuchsia-200 dark:border-fuchsia-500/30 bg-fuchsia-50/50 dark:bg-fuchsia-950/20",
    gradient: "via-fuchsia-500/40 dark:via-fuchsia-400/60",
  },
  emerald: {
    base: "border-emerald-200 dark:border-emerald-500/25 bg-white/40 dark:bg-emerald-950/30",
    gradient: "via-emerald-500/30 dark:via-emerald-400/60",
  },
  blue: {
    base: "border-blue-200 dark:border-blue-500/25 bg-white/40 dark:bg-blue-950/30",
    gradient: "via-blue-500/30 dark:via-blue-400/60",
  },
  orange: {
    base: "border-orange-200 dark:border-orange-500/25 bg-white/40 dark:bg-orange-950/30",
    gradient: "via-orange-500/30 dark:via-orange-400/60",
  }
}

const SciFiCard = React.forwardRef<HTMLDivElement, SciFiCardProps>(
  ({ className, color = "purple", glow = true, children, ...props }, ref) => {
    const theme = colorMap[color]

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[1.5rem] border backdrop-blur-md relative overflow-hidden shadow-sm transition-all duration-300",
          theme.base,
          className
        )}
        {...props}
      >
        {glow && (
          <div className={cn(
            "absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent",
            theme.gradient
          )} />
        )}
        {children}
      </div>
    )
  }
)
SciFiCard.displayName = "SciFiCard"

export { SciFiCard }
