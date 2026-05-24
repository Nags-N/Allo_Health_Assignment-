import { cn } from "@/lib/utils"

interface StockBadgeProps {
  available: number
  className?: string
}

export function StockBadge({ available, className }: StockBadgeProps) {
  let colorClass = "bg-green-100 text-green-800 border-green-200"
  let text = \`\${available} available\`

  if (available === 0) {
    colorClass = "bg-red-100 text-red-800 border-red-200"
    text = "Out of stock"
  } else if (available <= 5) {
    colorClass = "bg-yellow-100 text-yellow-800 border-yellow-200"
    text = \`Only \${available} left\`
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        colorClass,
        className
      )}
    >
      {text}
    </span>
  )
}
