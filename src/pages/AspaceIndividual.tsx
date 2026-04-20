import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página individual e independiente para la ruta ASPACE.
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 * Réplica standalone accesible en /aspace-individual
 */
const AspaceIndividual = () => {
  return (
    <RouteProvider defaultRoute="ASPACE">
      <RouteTemplate 
        routeCode="ASPACE" 
        routeName={getRouteDisplayName("ASPACE")} 
        showLogo={true}
      />
    </RouteProvider>
  );
};

export default AspaceIndividual;
