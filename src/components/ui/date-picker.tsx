
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
import { Input } from "@/components/ui/input"
import { formatDateInputString, parseDateInput } from "@/lib/formatters"

interface DatePickerProps {
  dateRange: DateRange | null
  onChange: (dateRange: DateRange | null) => void
  className?: string
}

export function DatePicker({ dateRange, onChange, className }: DatePickerProps) {
  const [startDateInput, setStartDateInput] = React.useState<string>(
    dateRange?.start ? format(dateRange.start, "MM/dd/yyyy") : ""
  );
  const [endDateInput, setEndDateInput] = React.useState<string>(
    dateRange?.end ? format(dateRange.end, "MM/dd/yyyy") : ""
  );
  const [isOpen, setIsOpen] = React.useState(false);

  // Update input fields when dateRange changes from outside
  React.useEffect(() => {
    setStartDateInput(dateRange?.start ? format(dateRange.start, "MM/dd/yyyy") : "");
    setEndDateInput(dateRange?.end ? format(dateRange.end, "MM/dd/yyyy") : "");
  }, [dateRange]);

  // Handle manual date input
  const handleDateInputSubmit = () => {
    try {
      const startDate = parseDateInput(startDateInput);
      const endDate = parseDateInput(endDateInput);
      
      // Validate dates
      if (startDate && endDate) {
        onChange({
          start: startDate,
          end: endDate
        });
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Error parsing date input:", error);
    }
  };

  // Handle direct input changes without automatic formatting
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(formatDateInputString(e.target.value));
    };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
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
          <div className="p-3 border-b">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <p className="text-sm mb-1">Start Date (MM/DD/YYYY)</p>
                <Input
                  placeholder="MM/DD/YYYY"
                  value={startDateInput}
                  onChange={handleInputChange(setStartDateInput)}
                  className="h-8"
                />
              </div>
              <div>
                <p className="text-sm mb-1">End Date (MM/DD/YYYY)</p>
                <Input
                  placeholder="MM/DD/YYYY"
                  value={endDateInput}
                  onChange={handleInputChange(setEndDateInput)}
                  className="h-8"
                />
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={handleDateInputSubmit}
              className="w-full"
            >
              Apply Custom Range
            </Button>
          </div>
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
