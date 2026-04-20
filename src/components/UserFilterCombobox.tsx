import { useState, useMemo, useCallback } from "react";
import { Check, ChevronsUpDown, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Passenger = {
  id: string;
  name: string;
  route: string;
  registration_number: number | null;
  is_active: boolean;
};

interface UserFilterComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  passengers: Passenger[];
}

// Maximum number of results to show at once to prevent UI blocking
const MAX_VISIBLE_RESULTS = 50;

export const UserFilterCombobox = ({
  value,
  onValueChange,
  passengers,
}: UserFilterComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get the selected passenger for display
  const selectedPassenger = useMemo(() => {
    if (!value || value === "all") return null;
    return passengers.find((p) => p.id === value);
  }, [value, passengers]);

  // Filter and sort passengers based on search query - with limit
  const filteredPassengers = useMemo(() => {
    const activePassengers = passengers.filter((p) => p.is_active);
    
    // Sort by route first, then by registration_number
    const sorted = [...activePassengers].sort((a, b) => {
      if (a.route !== b.route) {
        return a.route.localeCompare(b.route);
      }
      return (a.registration_number ?? 9999) - (b.registration_number ?? 9999);
    });

    if (!searchQuery.trim()) {
      // When no search, limit to MAX_VISIBLE_RESULTS to prevent blocking
      return sorted.slice(0, MAX_VISIBLE_RESULTS);
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = sorted.filter((p) => {
      return (
        p.name.toLowerCase().includes(query) ||
        p.route.toLowerCase().includes(query)
      );
    });

    // Return limited results
    return filtered.slice(0, MAX_VISIBLE_RESULTS);
  }, [passengers, searchQuery]);

  const totalActiveCount = useMemo(() => {
    return passengers.filter((p) => p.is_active).length;
  }, [passengers]);

  const handleSelect = useCallback((selectedId: string) => {
    onValueChange(selectedId);
    setOpen(false);
    setSearchQuery("");
  }, [onValueChange]);

  const displayValue = selectedPassenger
    ? `[${selectedPassenger.route}] ${selectedPassenger.name}`
    : !value || value === "all" 
      ? "Seleccionar usuario..."
      : "Todos los usuarios";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <div className="flex items-center gap-2 truncate">
            <Users size={16} className="text-muted-foreground shrink-0" />
            <span className="truncate">{displayValue}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0 bg-popover text-popover-foreground border shadow-lg z-[9999] overflow-hidden"
        align="start"
        sideOffset={4}
      >
        <div className="flex flex-col">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b px-3" role="search">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Buscar por nombre o ruta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 border-0 bg-transparent px-0 py-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
          </div>
          
          {/* Hint when there are many users */}
          {totalActiveCount > MAX_VISIBLE_RESULTS && (
            <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50 border-b">
              📋 {totalActiveCount} usuarios activos. Escribe para buscar.
            </div>
          )}

          {/* Results */}
          <ScrollArea className="max-h-[280px]">
            <div className="p-1">
              {/* Option for all users */}
              <button
                type="button"
                onClick={() => handleSelect("all")}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  value === "all" && "bg-accent"
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === "all" ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="font-medium">Todos los usuarios</span>
              </button>

              {/* List of passengers */}
              {filteredPassengers.length === 0 && searchQuery.trim() !== "" ? (
                <div className="py-3 px-2 text-center text-sm text-muted-foreground">
                  No se encontró "{searchQuery}"
                </div>
              ) : (
                filteredPassengers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelect(p.id)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      value === p.id && "bg-accent"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === p.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">
                      <span className="text-muted-foreground text-xs mr-1">[{p.route}]</span>
                      <span className="font-medium">{p.name}</span>
                    </span>
                  </button>
                ))
              )}

              {/* Show count when filtering */}
              {searchQuery.trim() && filteredPassengers.length > 0 && (
                <div className="py-2 px-2 text-center text-xs text-muted-foreground border-t mt-1">
                  {filteredPassengers.length} resultado(s) encontrado(s)
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};
