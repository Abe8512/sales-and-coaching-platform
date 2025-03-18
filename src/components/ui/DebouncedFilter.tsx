
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { debounce } from 'lodash';

interface DebouncedFilterProps {
  onFilterChange: (value: string) => void;
  placeholder?: string;
  initialValue?: string;
  debounceMs?: number;
  className?: string;
  preventSubmit?: boolean; // Prevent form submission on Enter
}

/**
 * A search filter input that debounces changes to prevent UI jittering during filtering
 */
export const DebouncedFilter: React.FC<DebouncedFilterProps> = ({
  onFilterChange,
  placeholder = "Search...",
  initialValue = "",
  debounceMs = 300,
  className = "",
  preventSubmit = true
}) => {
  const [inputValue, setInputValue] = useState(initialValue);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFilter = useCallback(
    debounce((value: string) => {
      onFilterChange(value);
      setIsTyping(false);
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
    setIsTyping(true);
    debouncedFilter(newValue);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent form submission on Enter
    if (preventSubmit && e.key === 'Enter') {
      e.preventDefault();
      // Force immediate filter application
      debouncedFilter.flush();
    }
  };
  
  // If initialValue changes externally, update the input
  useEffect(() => {
    if (initialValue !== inputValue && !isTyping) {
      setInputValue(initialValue);
    }
  }, [initialValue, inputValue, isTyping]);
  
  return (
    <div className={`relative ${className}`}>
      <Search className={`absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground ${isTyping ? 'text-primary' : ''}`} />
      <Input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`pl-8 transition-all ${isTyping ? 'border-primary' : ''}`}
      />
    </div>
  );
};

export default DebouncedFilter;
