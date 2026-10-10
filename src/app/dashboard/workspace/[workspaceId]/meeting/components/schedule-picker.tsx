"use client"

import { useMemo, useState } from "react"
import {
    addDays, addHours, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
    nextMonday, setHours, setMinutes, startOfDay, startOfMonth, startOfWeek,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface SchedulePickerProps {
    value: Date | null
    onChange: (value: Date | null) => void
}

const MINUTES = ["00", "15", "30", "45"]
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))

const at = (day: Date, h24: number, m: number) => setMinutes(setHours(startOfDay(day), h24), m)
const roundUp = (d: Date) => {
    const r = new Date(d)
    r.setSeconds(0, 0)
    r.setMinutes(Math.ceil(r.getMinutes() / 15) * 15)
    return r
}

/** Date and time chooser for scheduling: quick picks, a month grid and a clear time row. */
export function SchedulePicker({ value, onChange }: SchedulePickerProps) {
    const today = startOfDay(new Date())
    const [month, setMonth] = useState(() => startOfMonth(value ?? new Date()))

    const h24 = value ? value.getHours() : 9
    const minute = value ? value.getMinutes() : 0
    const hour12 = String(h24 % 12 === 0 ? 12 : h24 % 12)
    const pm = h24 >= 12

    const days = useMemo(
        () => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }),
        [month],
    )

    const setDay = (day: Date) => onChange(at(day, h24, minute))
    const setTime = (nextHour12: string, nextMinute: string, nextPm: boolean) => {
        const base = value ?? addDays(today, 1)
        const h = (Number(nextHour12) % 12) + (nextPm ? 12 : 0)
        onChange(at(base, h, Number(nextMinute)))
    }
    const choose = (d: Date) => { onChange(d); setMonth(startOfMonth(d)) }

    const quick = [
        { label: "In 1 hour", date: roundUp(addHours(new Date(), 1)) },
        { label: "Tomorrow 9 AM", date: at(addDays(today, 1), 9, 0) },
        { label: "Monday 9 AM", date: at(nextMonday(today), 9, 0) },
    ]
    const selectClass = "h-9 rounded-lg border bg-surface px-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
                {quick.map((q) => (
                    <button
                        key={q.label}
                        type="button"
                        onClick={() => choose(q.date)}
                        className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:border-brand/50 hover:bg-brand/10",
                            value && value.getTime() === q.date.getTime() ? "border-brand bg-brand/10 text-brand" : "text-ink/70",
                        )}
                    >
                        {q.label}
                    </button>
                ))}
            </div>

            <div className="rounded-xl border bg-surface p-3">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">{format(month, "MMMM yyyy")}</span>
                    <div className="flex gap-1">
                        <button type="button" aria-label="Previous month" disabled={isSameMonth(month, today)} onClick={() => setMonth(addMonths(month, -1))}
                            className="rounded-md p-1 text-ink/70 hover:bg-cream disabled:opacity-30 disabled:hover:bg-transparent">
                            <ChevronLeft className="size-4" />
                        </button>
                        <button type="button" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))} className="rounded-md p-1 text-ink/70 hover:bg-cream">
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-7 text-center text-[11px] font-medium text-ink/60">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="py-1">{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-y-0.5">
                    {days.map((day) => {
                        const past = day < today
                        const selected = !!value && isSameDay(day, value)
                        return (
                            <button
                                key={day.toISOString()}
                                type="button"
                                disabled={past}
                                aria-label={format(day, "EEEE d MMMM")}
                                aria-pressed={selected}
                                onClick={() => setDay(day)}
                                className={cn(
                                    "mx-auto flex size-8 items-center justify-center rounded-full text-xs transition-colors",
                                    !isSameMonth(day, month) && "text-ink/30",
                                    past && "cursor-not-allowed text-ink/20",
                                    !past && !selected && "hover:bg-brand/10",
                                    isSameDay(day, today) && !selected && "font-bold text-brand",
                                    selected && "bg-brand font-semibold text-white",
                                )}
                            >
                                {format(day, "d")}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink/60 w-9">Time</span>
                <select aria-label="Hour" className={selectClass} value={hour12} onChange={(e) => setTime(e.target.value, String(minute).padStart(2, "0"), pm)}>
                    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-ink/60">:</span>
                <select aria-label="Minute" className={selectClass} value={String(minute).padStart(2, "0")} onChange={(e) => setTime(hour12, e.target.value, pm)}>
                    {(MINUTES.includes(String(minute).padStart(2, "0")) ? MINUTES : [String(minute).padStart(2, "0"), ...MINUTES]).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select aria-label="AM or PM" className={selectClass} value={pm ? "PM" : "AM"} onChange={(e) => setTime(hour12, String(minute).padStart(2, "0"), e.target.value === "PM")}>
                    <option>AM</option>
                    <option>PM</option>
                </select>
            </div>

            <p className="rounded-lg bg-cream px-3 py-2 text-xs text-ink/70">
                {value ? <><span className="font-semibold text-ink">{format(value, "EEEE d MMMM, h:mm a")}</span> · {zone}</> : "Pick a day and time"}
            </p>
        </div>
    )
}
