import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(dateStr: string): string {
  const normalized = dateStr.endsWith("Z") ? dateStr : dateStr.replace(" ", "T") + "Z"
  const d = new Date(normalized)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function formatDate(dateStr: string): string {
  const normalized = dateStr.endsWith("Z") ? dateStr : dateStr.replace(" ", "T") + "Z"
  return new Date(normalized).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
