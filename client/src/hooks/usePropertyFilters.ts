import { propertyStatuses, propertyTypes, transactionTypes } from '@shared/validation';
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
      status: propertyStatuses.find(value => value === filters.status),
      type: propertyTypes.find(value => value === filters.type),
      transactionType: transactionTypes.find(value => value === filters.transactionType),
      city: (filters.city === 'all' || !filters.city) ? undefined : filters.city,
      minPrice: filters.minPrice ? Number.isFinite(Number(filters.minPrice)) ? Number(filters.minPrice) : undefined : undefined,
      maxPrice: filters.maxPrice ? Number.isFinite(Number(filters.maxPrice)) ? Number(filters.maxPrice) : undefined : undefined,
      minRooms: filters.minRooms ? Number.isInteger(Number(filters.minRooms)) ? Number(filters.minRooms) : undefined : undefined,
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
