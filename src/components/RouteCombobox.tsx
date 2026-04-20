import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Bus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getRouteLabel } from "@/lib/routes";

interface RouteComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  availableRoutes: string[];
  matiaMode?: boolean;
  onRefresh?: () => void;
}

export const RouteCombobox = ({
  value,
  onValueChange,
  availableRoutes,
  matiaMode = false,
  onRefresh,
}: RouteComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return availableRoutes;
    const query = searchQuery.toLowerCase().trim();
    return availableRoutes.filter((route) => {
      const routeLabel = getRouteLabel(route).toLowerCase();
      const routeCode = route.toLowerCase();
      return routeLabel.includes(query) || routeCode.includes(query);
    });
  }, [availableRoutes, searchQuery]);

  const handleSelect = (selectedRoute: string) => {
    onValueChange(selectedRoute);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {matiaMode ? (
          <button
            role="combobox"
            aria-expanded={open}
            className="w-full flex items-center gap-3 px-4 h-12 bg-white border border-[#E0E0E0] rounded-xl shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <Bus size={20} className="text-[#E8007D] shrink-0" />
            <span className={cn(
              "flex-1 truncate font-semibold text-sm",
              value ? "text-[#E8007D]" : "text-[#333333]"
            )}>
              {value ? getRouteLabel(value) : "Seleccionar ruta..."}
            </span>
            {onRefresh && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                className="p-1.5 rounded-lg hover:bg-[#E8007D]/10 transition-colors shrink-0"
                aria-label="Recargar"
              >
                <RefreshCw size={14} className="text-[#E8007D]" />
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-[#999]" />
          </button>
        ) : (
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[280px] justify-between font-semibold bg-black text-white border-black hover:bg-gray-800 hover:text-white dark:bg-black dark:text-white dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-2 truncate">
              <Bus size={22} className="text-white shrink-0" />
              <span className="truncate text-white">
                {value ? getRouteLabel(value) : "Seleccionar ruta..."}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 text-white opacity-80" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[310px] p-0 bg-popover z-50"
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions={true}
        collisionPadding={16}
      >
        <Command shouldFilter={false} value={value || "__none__"}>
          <CommandInput
            placeholder="Buscar ruta..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[60vh] overflow-y-auto">
            <CommandEmpty>
              <div className="py-3 px-2 text-center text-sm text-muted-foreground">
                No se encontró "{searchQuery}"
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredRoutes.map((route) => (
                <CommandItem
                  key={route}
                  value={route}
                  onSelect={() => handleSelect(route)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === route ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-medium">{getRouteLabel(route)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
