
import React, { useState, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { debounce } from 'lodash';

interface DebouncedFilterProps {
  onFilterChange: (value: string) => void;
  placeholder?: string;
  initialValue?: string;
  debounceMs?: number;
  className?: string;
}

/**
 * A search filter input that debounces changes to prevent UI jittering during filtering
 */
export const DebouncedFilter: React.FC<DebouncedFilterProps> = ({
  onFilterChange,
  placeholder = "Search...",
  initialValue = "",
  debounceMs = 300,
  className = ""
}) => {
  const [inputValue, setInputValue] = useState(initialValue);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFilter = useCallback(
    debounce((value: string) => {
      onFilterChange(value);
    }, debounceMs),
    [onFilterChange, debounceMs]
  );
  
  useEffect(() => {
    return () => {
      debouncedFilter.cancel();
    };
  }, [debouncedFilter]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    debouncedFilter(newValue);
  };
  
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        className="pl-8"
      />
    </div>
  );
};

export default DebouncedFilter;
