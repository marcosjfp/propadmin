import { useState, useMemo } from "react";

export interface PropertyFilters {
  search: string;
  type: string;
  transactionType: string;
  city: string;
  minPrice: string;
  maxPrice: string;
  minRooms: string;
  status: string;
}

export function usePropertyFilters() {
  const [filters, setFilters] = useState<PropertyFilters>({
    search: "",
    type: "all",
    transactionType: "all",
    city: "",
    minPrice: "",
    maxPrice: "",
    minRooms: "",
    status: "all",
  });

  const updateFilter = (key: keyof PropertyFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      type: "all",
      transactionType: "all",
      city: "",
      minPrice: "",
      maxPrice: "",
      minRooms: "",
      status: "all",
    });
  };

  // Helper to check if any filters are active
  const hasActiveFilters = 
    !!filters.search || 
    filters.type !== "all" || 
    filters.transactionType !== "all" || 
    (!!filters.city && filters.city !== "all") || 
    !!filters.minPrice || 
    !!filters.maxPrice || 
    !!filters.minRooms || 
    filters.status !== "all";

  // Convert filters for TRPC query
  const queryParams = useMemo(() => {
    return {
      search: filters.search || undefined,
      status: filters.status === 'all' ? undefined : filters.status,
      type: filters.type === 'all' ? undefined : filters.type,
      transactionType: filters.transactionType === 'all' ? undefined : filters.transactionType,
      city: (filters.city === 'all' || !filters.city) ? undefined : filters.city,
      minPrice: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
      minRooms: filters.minRooms ? parseInt(filters.minRooms) : undefined,
    };
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    queryParams,
  };
}
