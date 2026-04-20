import { RouteTemplate } from "@/components/RouteTemplate";
import { RouteProvider } from "@/context/RouteContext";
import { getRouteDisplayName } from "@/lib/routes";

/**
 * Página individual para la ruta GAUTENA EGILUZE HONDARRIBIA.
 * Esta página tiene su PROPIO contexto aislado - no comparte estado con la web general.
 * Accesible en /egiluze
 */
const Egiluze = () => {
  return (
    <RouteProvider defaultRoute="EGILUZE">
      <RouteTemplate 
        routeCode="EGILUZE" 
        routeName={getRouteDisplayName("EGILUZE")} 
        showLogo={true}
      />
    </RouteProvider>
  );
};

export default Egiluze;
