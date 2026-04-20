import { createContext, useContext, useState, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MATIA_ALLOWED_ROUTES } from "@/lib/matiaRoutes";

type RouteContextType = {
  currentRoute: string;
  setCurrentRoute: (route: string) => void;
  availableRoutes: string[];
  lastUpdated: Date | null;
  setLastUpdated: (date: Date | null) => void;
  isReadOnly: boolean;
};

const RouteContext = createContext<RouteContextType | undefined>(undefined);

interface RouteProviderProps {
  children: ReactNode;
  defaultRoute?: string;
}

const ALL_ROUTES = ["ASPACE", /* "AMARAEN", — oculta temporalmente */ "AMARAEN FINDE", "BERMINGHAM", "FRAISORO", "FRAISORO_2", "IGELDO", "LAMOROUSE", "LASARTE", "MATIA", "EGURTZEGI", "ARGIXAO_1", "ARGIXAO_2"];

export const RouteProvider = ({ children, defaultRoute = "" }: RouteProviderProps) => {
  const { isMatia } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string>(defaultRoute);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const availableRoutes = isMatia
    ? ALL_ROUTES.filter(r => (MATIA_ALLOWED_ROUTES as readonly string[]).includes(r))
    : ALL_ROUTES;

  const isReadOnly = isMatia;

  return (
    <RouteContext.Provider value={{ currentRoute, setCurrentRoute, availableRoutes, lastUpdated, setLastUpdated, isReadOnly }}>
      {children}
    </RouteContext.Provider>
  );
};

export const useRoute = () => {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error("useRoute must be used within a RouteProvider");
  }
  return context;
};

