
import React, { createContext, useState, useContext, ReactNode } from "react";
import { DateRange } from "react-day-picker";
import { DataFilters } from "@/services/SharedDataService";

interface SharedFilterContextType {
  filters: DataFilters;
  updateDateRange: (dateRange: DateRange | undefined) => void;
  updateRepIds: (repIds: string[]) => void;
  updateCallTypes: (callTypes: string[]) => void;
  updateProductLines: (productLines: string[]) => void;
  clearAllFilters: () => void;
}

const SharedFilterContext = createContext<SharedFilterContextType | undefined>(undefined);

export const SharedFilterProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFilters] = useState<DataFilters>({
    dateRange: undefined,
    repIds: [],
    callTypes: [],
    productLines: []
  });

  const updateDateRange = (dateRange: DateRange | undefined) => {
    setFilters(prev => ({ ...prev, dateRange }));
  };

  const updateRepIds = (repIds: string[]) => {
    setFilters(prev => ({ ...prev, repIds }));
  };

  const updateCallTypes = (callTypes: string[]) => {
    setFilters(prev => ({ ...prev, callTypes }));
  };

  const updateProductLines = (productLines: string[]) => {
    setFilters(prev => ({ ...prev, productLines }));
  };

  const clearAllFilters = () => {
    setFilters({
      dateRange: undefined,
      repIds: [],
      callTypes: [],
      productLines: []
    });
  };

  return (
    <SharedFilterContext.Provider
      value={{
        filters,
        updateDateRange,
        updateRepIds,
        updateCallTypes,
        updateProductLines,
        clearAllFilters
      }}
    >
      {children}
    </SharedFilterContext.Provider>
  );
};

export const useSharedFilters = () => {
  const context = useContext(SharedFilterContext);
  if (!context) {
    throw new Error("useSharedFilters must be used within a SharedFilterProvider");
  }
  return context;
};
