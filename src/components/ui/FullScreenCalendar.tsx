"use client"

import * as React from "react"
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfToday,
  startOfWeek,
} from "date-fns"
import { zhCN } from "date-fns/locale"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/utils/cn"
import { Button } from "@/components/ui/Button"
import { Separator } from "@/components/ui/Separator"
import { useMediaQuery } from "@/hooks/use-media-query"

export type StageStatus = 'past' | 'current' | 'future';

export interface CalendarItem {
  id: string;
  name: string;
  date: number;
  color?: string;
  stage?: number;
  stageStatus: StageStatus;
}

interface FullScreenCalendarProps {
  items: CalendarItem[]
  emptyLabel?: string
  formatLabel?: (item: CalendarItem) => string
}

const colStartClasses = [
  "",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
]

export function FullScreenCalendar({ items, emptyLabel = "暂无", formatLabel }: FullScreenCalendarProps) {
  const today = startOfToday()
  const [selectedDay, setSelectedDay] = React.useState(today)
  const [currentMonth, setCurrentMonth] = React.useState(format(today, "yyyy-MM"))
  const firstDayCurrentMonth = parse(currentMonth, "yyyy-MM", new Date())
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const simplifyName = (n: string) => n.replace(/^\[项目\]\s*/g, "").replace(/part/gi, "-")
  const labelFn = formatLabel || ((item: CalendarItem) => simplifyName(item.name))

  const itemsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of items) {
      const key = format(new Date(item.date), "yyyy-MM-dd")
      const existing = map.get(key) || []
      existing.push(item)
      map.set(key, existing)
    }
    return map
  }, [items])

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth)),
  })

  function previousMonth() {
    setCurrentMonth(format(add(firstDayCurrentMonth, { months: -1 }), "yyyy-MM"))
  }

  function nextMonth() {
    setCurrentMonth(format(add(firstDayCurrentMonth, { months: 1 }), "yyyy-MM"))
  }

  function goToToday() {
    setCurrentMonth(format(today, "yyyy-MM"))
    setSelectedDay(today)
  }

  const totalInMonth = React.useMemo(() => {
    let count = 0
    for (const day of days) {
      count += (itemsByDate.get(format(day, "yyyy-MM-dd")) || []).length
    }
    return count
  }, [itemsByDate, days])

  return (
    <div className="flex flex-1 flex-col">
      {/* Calendar Header */}
      <div className="flex flex-col space-y-4 p-4 md:flex-row md:items-center md:justify-between md:space-y-0 lg:flex-none">
        <div className="flex flex-auto">
          <div className="flex items-center gap-4">
            <div className="hidden w-20 flex-col items-center justify-center rounded-lg border bg-muted p-0.5 md:flex">
              <p className="p-1 text-xs uppercase text-muted-foreground">
                {format(today, "M月", { locale: zhCN })}
              </p>
              <div className="flex w-full items-center justify-center rounded-lg border bg-background p-0.5 text-lg font-bold">
                <span>{format(today, "d")}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-foreground">
                {format(firstDayCurrentMonth, "yyyy年M月", { locale: zhCN })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {totalInMonth} 项复习
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex w-full -space-x-px rounded-lg shadow-sm shadow-black/5 md:w-auto rtl:space-x-reverse">
            <Button
              onClick={previousMonth}
              className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10"
              variant="outline"
              size="icon"
              aria-label="上一月"
            >
              <ChevronLeftIcon size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
            <Button
              onClick={goToToday}
              className="w-full rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 md:w-auto"
              variant="outline"
            >
              今天
            </Button>
            <Button
              onClick={nextMonth}
              className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10"
              variant="outline"
              size="icon"
              aria-label="下一月"
            >
              <ChevronRightIcon size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="lg:flex lg:flex-auto lg:flex-col">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 border text-center text-xs font-semibold leading-6 lg:flex-none">
          <div className="border-r py-2.5">一</div>
          <div className="border-r py-2.5">二</div>
          <div className="border-r py-2.5">三</div>
          <div className="border-r py-2.5">四</div>
          <div className="border-r py-2.5">五</div>
          <div className="border-r py-2.5">六</div>
          <div className="py-2.5">日</div>
        </div>

        {/* Calendar Days */}
        <div className="flex text-xs leading-6 lg:flex-auto">
          <div className="hidden w-full border-x lg:grid lg:grid-cols-7 lg:grid-rows-5">
            {days.map((day, dayIdx) => {
              const dateKey = format(day, "yyyy-MM-dd")
              const dayItems = itemsByDate.get(dateKey) || []

              return (
                <div
                  key={dayIdx}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    dayIdx === 0 && colStartClasses[getDay(day)],
                    !isSameMonth(day, firstDayCurrentMonth) && "bg-accent/50 text-muted-foreground",
                    "relative flex flex-col border-b border-r hover:bg-gray-100 dark:hover:bg-gray-800 focus:z-10 cursor-pointer transition-colors duration-150",
                  )}
                >
                  <header className="flex items-center justify-between p-2.5">
                    <button
                      type="button"
                      className={cn(
                        isEqual(day, selectedDay) && "bg-gray-900 text-white dark:bg-white dark:text-gray-900",
                        !isEqual(day, selectedDay) && isToday(day) && "border-2 border-blue-500 text-blue-600 font-semibold",
                        !isEqual(day, selectedDay) && !isToday(day) && isSameMonth(day, firstDayCurrentMonth) && "text-foreground",
                        !isEqual(day, selectedDay) && !isToday(day) && !isSameMonth(day, firstDayCurrentMonth) && "text-muted-foreground",
                        (isEqual(day, selectedDay) || isToday(day)) && "font-semibold",
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs hover:border transition-all duration-200",
                      )}
                    >
                      <time dateTime={dateKey}>{format(day, "d")}</time>
                    </button>
                  </header>
                  <div className="flex-1 p-2.5">
                    {dayItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-1 rounded px-1 py-px text-[10px] leading-tight mb-0.5 transition-colors duration-150 hover:bg-gray-100/60 dark:hover:bg-gray-800/60",
                          item.date < today.getTime() && !isToday(day) && "opacity-40",
                        )}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color || "#6366f1" }}
                        />
                        <span className="truncate">{labelFn(item)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mobile */}
          <div className="isolate grid w-full grid-cols-7 grid-rows-5 border-x lg:hidden">
            {days.map((day, dayIdx) => {
              const dateKey = format(day, "yyyy-MM-dd")
              const dayItems = itemsByDate.get(dateKey) || []

              return (
                <button
                  onClick={() => setSelectedDay(day)}
                  key={dayIdx}
                  type="button"
                  className={cn(
                    isEqual(day, selectedDay) && "text-primary-foreground",
                    !isEqual(day, selectedDay) && !isToday(day) && isSameMonth(day, firstDayCurrentMonth) && "text-foreground",
                    !isEqual(day, selectedDay) && !isToday(day) && !isSameMonth(day, firstDayCurrentMonth) && "text-muted-foreground",
                    (isEqual(day, selectedDay) || isToday(day)) && "font-semibold",
                    "flex h-14 flex-col border-b border-r px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 focus:z-10 transition-colors duration-150",
                  )}
                >
                  <time
                    dateTime={dateKey}
                    className={cn(
                      "ml-auto flex size-6 items-center justify-center rounded-full transition-all duration-200",
                      isEqual(day, selectedDay) && isToday(day) && "bg-gray-900 text-white dark:bg-white dark:text-gray-900",
                      isEqual(day, selectedDay) && !isToday(day) && "bg-gray-900 text-white dark:bg-white dark:text-gray-900",
                    )}
                  >
                    {format(day, "d")}
                  </time>
                  {dayItems.length > 0 && (
                    <div className="-mx-0.5 mt-auto flex flex-wrap-reverse">
                      {dayItems.slice(0, 5).map((item) => (
                        <span
                          key={item.id}
                          className="mx-0.5 mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground"
                          style={{ backgroundColor: item.color || undefined }}
                        />
                      ))}
                      {dayItems.length > 5 && (
                        <span className="text-[8px] text-muted-foreground mx-0.5 mt-1">+{dayItems.length - 5}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Selected day detail */}
      {(() => {
        const selectedItems = itemsByDate.get(format(selectedDay, "yyyy-MM-dd")) || []
        if (selectedItems.length === 0) return null
        return (
          <div className="border-t p-4 space-y-1.5">
            <h3 className="text-sm font-semibold">
              {format(selectedDay, "M月d日 EEEE", { locale: zhCN })}
              <span className="text-muted-foreground font-normal ml-2 text-xs">{selectedItems.length} 项</span>
            </h3>
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 text-sm py-1.5 px-3 rounded-lg transition-all duration-150 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 active:scale-[0.99]",
                  item.date < today.getTime() && !isToday(selectedDay) && "opacity-50",
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color || "#6366f1" }} />
                <span className="flex-1">{labelFn(item)}</span>
                {item.stage !== undefined && (
                  <span className="text-xs px-2 py-0.5 rounded-full shrink-0 bg-muted text-muted-foreground">R{item.stage + 1}</span>
                )}
              </div>
            ))}
          </div>
        )
      })()}

      {items.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">{emptyLabel}</div>
      )}
    </div>
  )
}
