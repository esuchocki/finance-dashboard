
import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  dateRange: DateRange | null
  onChange: (dateRange: DateRange | null) => void
  className?: string
}

export function DatePicker({ dateRange, onChange, className }: DatePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.start ? (
              dateRange.end ? (
                <>
                  {format(dateRange.start, "LLL dd, y")} -{" "}
                  {format(dateRange.end, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.start, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.start}
            selected={{
              from: dateRange?.start || undefined,
              to: dateRange?.end || undefined,
            }}
            onSelect={(selected) => {
              onChange(
                selected?.from && selected?.to
                  ? { start: selected.from, end: selected.to }
                  : null
              )
            }}
            numberOfMonths={2}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
