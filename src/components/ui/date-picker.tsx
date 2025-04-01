
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

  // Format function to add slashes automatically as user types
  const formatDateInput = (input: string): string => {
    // Remove any non-digit characters
    const digitsOnly = input.replace(/\D/g, "");
    
    // Add slashes as the user types
    if (digitsOnly.length <= 2) {
      return digitsOnly;
    } else if (digitsOnly.length <= 4) {
      return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
    } else {
      return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
    }
  };

  // Handle manual date input
  const handleDateInputSubmit = () => {
    try {
      // Parse dates from MM/DD/YYYY format
      const startParts = startDateInput.split("/");
      const endParts = endDateInput.split("/");
      
      if (startParts.length === 3 && endParts.length === 3) {
        const startDate = new Date(
          parseInt(startParts[2]), 
          parseInt(startParts[0]) - 1, 
          parseInt(startParts[1])
        );
        
        const endDate = new Date(
          parseInt(endParts[2]), 
          parseInt(endParts[0]) - 1, 
          parseInt(endParts[1])
        );
        
        // Validate dates
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          onChange({
            start: startDate,
            end: endDate
          });
          setIsOpen(false);
        }
      }
    } catch (error) {
      console.error("Error parsing date input:", error);
    }
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
                  onChange={(e) => setStartDateInput(formatDateInput(e.target.value))}
                  className="h-8"
                />
              </div>
              <div>
                <p className="text-sm mb-1">End Date (MM/DD/YYYY)</p>
                <Input
                  placeholder="MM/DD/YYYY"
                  value={endDateInput}
                  onChange={(e) => setEndDateInput(formatDateInput(e.target.value))}
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
