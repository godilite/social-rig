import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { CalendarEntry } from "../lib/api"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { cn } from "../lib/utils"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const platformColors: Record<string, string> = {
  x: "bg-[#24292f] text-white",
  twitter: "bg-[#24292f] text-white",
  linkedin: "bg-[#0969da] text-white",
  devto: "bg-[#1f2328] text-white",
  hashnode: "bg-[#0969da] text-white",
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()

  const days: { date: number; month: number; year: number; outside: boolean }[] = []

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ date: daysInPrev - i, month: month - 1, year, outside: true })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: i, month, year, outside: false })
  }
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: i, month: month + 1, year, outside: true })
  }

  return days
}

export default function CalendarPage() {
  const [current, setCurrent] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const monthStr = `${current.year}-${String(current.month + 1).padStart(2, "0")}`
  const today = new Date()

  const { data: entries } = useQuery({
    queryKey: ["calendar", monthStr],
    queryFn: () => api.calendar.list({ month: monthStr }),
  })

  const days = useMemo(
    () => getMonthDays(current.year, current.month),
    [current.year, current.month],
  )

  const entriesByDay = useMemo(() => {
    const map: Record<number, CalendarEntry[]> = {}
    entries?.forEach((e) => {
      const d = new Date(e.scheduled_at).getDate()
      const m = new Date(e.scheduled_at).getMonth()
      if (m === current.month) {
        if (!map[d]) map[d] = []
        map[d].push(e)
      }
    })
    return map
  }, [entries, current.month])

  const prev = () => {
    setCurrent((c) =>
      c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 },
    )
  }

  const next = () => {
    setCurrent((c) =>
      c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 },
    )
  }

  const monthName = new Date(current.year, current.month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const isToday = (day: { date: number; month: number; outside: boolean }) =>
    !day.outside &&
    day.date === today.getDate() &&
    current.month === today.getMonth() &&
    current.year === today.getFullYear()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prev}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#d0d7de] text-[#656d76] transition-colors hover:bg-[#f6f8fa]"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="min-w-[180px] text-center text-base font-semibold text-[#1f2328]">
            {monthName}
          </h2>
          <button
            onClick={next}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#d0d7de] text-[#656d76] transition-colors hover:bg-[#f6f8fa]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={() => setCurrent({ year: today.getFullYear(), month: today.getMonth() })}
          className="rounded-md px-3 py-1.5 text-[13px] font-medium text-[#656d76] transition-colors hover:bg-[#f6f8fa]"
        >
          Today
        </button>
      </div>

      <div className="overflow-hidden rounded-md border border-[#d0d7de]">
        <div className="grid grid-cols-7 border-b border-[#d0d7de] bg-[#f6f8fa]">
          {DAYS.map((d) => (
            <div key={d} className="py-3 text-center text-[12px] font-semibold uppercase tracking-wider text-[#656d76]">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => (
            <div
              key={i}
              className={cn(
                "min-h-[100px] border-b border-r border-[#d8dee4] p-2 transition-colors last:border-r-0",
                day.outside ? "bg-[#f6f8fa]" : "bg-white hover:bg-[#f6f8fa]",
                i % 7 === 6 && "border-r-0",
              )}
            >
              <div
                className={cn(
                  "mb-1 flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-medium",
                  day.outside && "text-[#d0d7de]",
                  !day.outside && "text-[#1f2328]",
                  isToday(day) && "bg-[#0969da] font-bold text-white",
                )}
              >
                {day.date}
              </div>
              {!day.outside &&
                entriesByDay[day.date]?.map((e) => (
                  <div
                    key={e.id}
                    className={cn(
                      "mb-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                      platformColors[e.platform.toLowerCase()] ?? "bg-[#ddf4ff] text-[#0969da]",
                    )}
                  >
                    {e.platform}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>

      {!entries?.length && (
        <div className="flex flex-col items-center justify-center py-8">
          <Calendar size={24} className="text-[#d0d7de]" />
          <p className="mt-2 text-[13px] text-[#656d76]">No posts scheduled this month</p>
        </div>
      )}
    </div>
  )
}
