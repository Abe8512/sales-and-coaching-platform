
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { debounce } from "lodash";

interface DateRangeFilterProps {
  dateRange: DateRange | undefined;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  className?: string;
  label?: string;
}

export function DateRangeFilter({ 
  dateRange, 
  setDateRange, 
  className = "",
  label = "Pick a date range" 
}: DateRangeFilterProps) {
  // Local state to prevent twitching during updates
  const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(dateRange);
  const [isOpen, setIsOpen] = useState(false);
  
  // Update local state when prop changes
  useEffect(() => {
    setLocalDateRange(dateRange);
  }, [dateRange]);
  
  // Debounce the update to parent to prevent multiple rapid rerenders
  const debouncedSetDateRange = debounce((range: DateRange | undefined) => {
    setDateRange(range);
  }, 300);
  
  // Handle local selection changes
  const handleSelect = (range: DateRange | undefined) => {
    setLocalDateRange(range);
    
    // Only close popover when a complete range is selected
    if (range?.from && range?.to) {
      debouncedSetDateRange(range);
      setIsOpen(false);
    } else if (range?.from) {
      // Don't close when only start date is selected
      debouncedSetDateRange(range);
    }
  };

  return (
    <div className={`grid gap-2 ${className}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !localDateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {localDateRange?.from ? (
              localDateRange.to ? (
                <>
                  {format(localDateRange.from, "LLL dd, y")} -{" "}
                  {format(localDateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(localDateRange.from, "LLL dd, y")
              )
            ) : (
              <span>{label}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={localDateRange?.from}
            selected={localDateRange}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateRangeFilter;
