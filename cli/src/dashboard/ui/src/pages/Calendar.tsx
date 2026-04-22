import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "../lib/api"
import type { CalendarEntry } from "../lib/api"
import { ChevronLeft, ChevronRight } from "lucide-react"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

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

  return (
    <div>
      <h1 className="page-title">Calendar</h1>

      <div className="month-nav">
        <button className="btn btn-ghost btn-sm" onClick={prev}><ChevronLeft size={16} /></button>
        <h2>{monthName}</h2>
        <button className="btn btn-ghost btn-sm" onClick={next}><ChevronRight size={16} /></button>
      </div>

      <div className="calendar-grid">
        {DAYS.map((d) => (
          <div key={d} className="calendar-header">{d}</div>
        ))}
        {days.map((day, i) => (
          <div key={i} className={`calendar-day ${day.outside ? "outside" : ""}`}>
            <div className="day-num">{day.date}</div>
            {!day.outside &&
              entriesByDay[day.date]?.map((e) => (
                <div key={e.id} className="calendar-entry">
                  {e.platform}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
