import { useState, useEffect } from "react";
import { useDailyChanges } from "@/hooks/useOperatorConfirmation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ClipboardList, Calendar, Info } from "lucide-react";

const ACTION_ICONS: Record<string, string> = {
  insert: "✅",
  update: "✏️",
  delete: "⚠️",
};

const ACTION_LABELS: Record<string, string> = {
  insert: "Nuevo registro",
  update: "Modificación",
  delete: "Eliminación",
};

export const DailyChangesButton = () => {
  const { changes, loading, fetchChanges, isOperator } = useDailyChanges();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) fetchChanges();
  }, [open, fetchChanges]);

  if (!isOperator) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs font-semibold"
      >
        <ClipboardList size={16} />
        <span className="hidden sm:inline">Cambios del día</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar size={20} className="text-primary" />
              Cambios registrados hoy
            </DialogTitle>
            <DialogDescription>
              Resumen de todas las modificaciones realizadas durante el día
            </DialogDescription>
          </DialogHeader>

          {/* Success header */}
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
            <p className="font-semibold text-green-800 dark:text-green-200 text-sm">
              ✅ Cambios registrados correctamente
            </p>
            <p className="text-green-700 dark:text-green-300 text-xs mt-0.5">
              Todos los cambios serán operativos a partir de mañana
            </p>
          </div>

          {/* Changes list */}
          <div className="max-h-[40vh] overflow-y-auto space-y-2">
            {loading ? (
              <p className="text-center text-muted-foreground text-sm py-4">Cargando...</p>
            ) : changes.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">
                No hay cambios registrados hoy
              </p>
            ) : (
              changes.map((change: any) => {
                const details = change.details || {};
                return (
                  <div
                    key={change.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-card text-sm"
                  >
                    <span className="text-lg shrink-0 mt-0.5">
                      {ACTION_ICONS[change.action_type] || "📝"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {ACTION_LABELS[change.action_type] || change.action_type}
                        {details.table && (
                          <span className="text-muted-foreground font-normal"> en {details.table}</span>
                        )}
                      </p>
                      {details.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {details.description}
                        </p>
                      )}
                      {details.route && (
                        <span className="inline-block text-[10px] bg-muted px-1.5 py-0.5 rounded mt-1 font-medium">
                          Ruta: {details.route}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                      {new Date(change.created_at).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Info banner */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 flex items-start gap-2">
            <Info size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 dark:text-blue-200">
              <p className="font-medium">📅 Estos cambios estarán activos a partir de mañana.</p>
              <p className="mt-0.5">
                La operativa de hoy continúa con los datos que se generaron esta mañana.
                Mañana el sistema actualizará automáticamente las rutas con los nuevos datos.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setOpen(false)}>Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
