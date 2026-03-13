import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";
import { PropertyFilters as FilterState } from "@/hooks/usePropertyFilters";

interface PropertyFiltersProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  filters: FilterState;
  updateFilter: (key: keyof FilterState, value: string) => void;
  clearFilters: () => void;
  availableCities: string[];
}

export function PropertyFilters({
  showFilters,
  setShowFilters,
  filters,
  updateFilter,
  clearFilters,
  availableCities
}: PropertyFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Digite cidade, bairro, ID ou termo..." 
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
          <Button 
            variant={showFilters ? "secondary" : "outline"} 
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 md:flex-none whitespace-nowrap"
          >
            <Filter className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">
              Filtros {Object.values(filters).filter(v => v !== "" && v !== "all").length > 0 && 
                `(${Object.values(filters).filter(v => v !== "" && v !== "all").length})`}
            </span>
            <span className="sm:hidden">
               {Object.values(filters).filter(v => v !== "" && v !== "all").length > 0 && 
                `(${Object.values(filters).filter(v => v !== "" && v !== "all").length})`}
            </span>
          </Button>
          {(Object.values(filters).some(v => v !== "" && v !== "all")) && (
            <Button 
              variant="ghost" 
              onClick={clearFilters}
              className="px-2"
              title="Limpar todos os filtros"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t mt-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de Negócio</label>
            <Select value={filters.transactionType} onValueChange={(v) => updateFilter("transactionType", v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Venda ou Aluguel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="venda">Venda</SelectItem>
                <SelectItem value="aluguel">Aluguel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de Imóvel</label>
            <Select value={filters.type} onValueChange={(v) => updateFilter("type", v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Casa, Apto..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="apartamento">Apartamento</SelectItem>
                <SelectItem value="casa">Casa</SelectItem>
                <SelectItem value="terreno">Terreno</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Cidade</label>
            <Select value={filters.city || "all"} onValueChange={(v) => updateFilter("city", v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Qualquer cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer cidade</SelectItem>
                {availableCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
            <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Qualquer status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="vendida">Vendida</SelectItem>
                <SelectItem value="alugada">Alugada</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Preço Mínimo (R$)</label>
            <Input 
              type="number" 
              placeholder="Ex: 100000" 
              value={filters.minPrice}
              onChange={(e) => updateFilter("minPrice", e.target.value)}
              className="h-9"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Preço Máximo (R$)</label>
            <Input 
              type="number" 
              placeholder="Ex: 500000" 
              value={filters.maxPrice}
              onChange={(e) => updateFilter("maxPrice", e.target.value)}
              className="h-9"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Quartos (Mínimo)</label>
            <Select value={filters.minRooms || "all"} onValueChange={(v) => updateFilter("minRooms", v === "all" ? "" : v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Indiferente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Indiferente</SelectItem>
                <SelectItem value="1">1+ quarto</SelectItem>
                <SelectItem value="2">2+ quartos</SelectItem>
                <SelectItem value="3">3+ quartos</SelectItem>
                <SelectItem value="4">4+ quartos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
