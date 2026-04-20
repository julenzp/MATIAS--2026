import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { History, Download, Filter, Calendar, User, Clock, Trash2, Eraser, UserPlus, MessageSquare, Edit } from "lucide-react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";

type ChangeRecord = {
  id: string;
  user_code: string;
  action_type: string;
  page_name: string;
  details: any;
  created_at: string;
};

const ALLOWED_OPERATOR = "72596F";

const ACTION_LABELS: Record<string, string> = {
  insert: "Alta",
  INSERT: "Alta",
  update: "Modificación",
  UPDATE: "Modificación",
  delete: "Eliminación",
  DELETE: "Eliminación",
  INCIDENCIA_CREADA: "Incidencia",
  INCIDENCIA_RESPONDIDA: "Respuesta",
  INCIDENCIA_LEIDA: "Lectura",
};

const ACTION_ICONS: Record<string, typeof Edit> = {
  insert: UserPlus,
  INSERT: UserPlus,
  update: Edit,
  UPDATE: Edit,
  delete: Trash2,
  DELETE: Trash2,
  INCIDENCIA_CREADA: MessageSquare,
  INCIDENCIA_RESPONDIDA: MessageSquare,
  INCIDENCIA_LEIDA: MessageSquare,
};

const ACTION_COLORS: Record<string, string> = {
  insert: "text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/30 dark:border-green-800",
  INSERT: "text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/30 dark:border-green-800",
  update: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800",
  UPDATE: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800",
  delete: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/30 dark:border-red-800",
  DELETE: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/30 dark:border-red-800",
  INCIDENCIA_CREADA: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-800",
  INCIDENCIA_RESPONDIDA: "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-950/30 dark:border-purple-800",
  INCIDENCIA_LEIDA: "text-muted-foreground bg-muted/50 border-border",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre",
  route: "Ruta",
  contact_phone: "Teléfono",
  contact_name: "Contacto",
  location: "Dirección",
  pickup_location: "Dirección",
  trip_type: "Tipo viaje",
  is_active: "Estado",
  scheduled_time: "Horario",
  schedule_section: "Sección",
  sort_order: "Orden",
  registration_number: "Nº Registro",
};

const PAGE_LABELS: Record<string, string> = {
  passengers: "Pasajero",
  schedule_trips: "Horario",
};

function formatFieldValue(key: string, value: any): string {
  if (value === null || value === undefined) return "—";
  if (key === "is_active") return value ? "Activo" : "Baja";
  if (key === "trip_type") {
    const map: Record<string, string> = { ida_vuelta: "Ida y vuelta", ida: "Solo ida", vuelta: "Solo vuelta" };
    return map[value] || String(value);
  }
  return String(value);
}

function extractPassengerName(record: ChangeRecord): string {
  const d = record.details;
  if (d?.passenger_name) return d.passenger_name;
  if (d?.snapshot_completo?.name) return d.snapshot_completo.name;
  const descMatch = d?.description?.match(/(?:Actualizado|Nuevo pasajero|Eliminado|Alta|Baja|añadido)[:.]?\s*(.+)/i);
  if (descMatch?.[1]) return descMatch[1];
  if (d?.changes?.name?.despues) return d.changes.name.despues;
  if (d?.changes?.name?.antes) return d.changes.name.antes;
  return "";
}

function extractRoute(record: ChangeRecord): string {
  return record.details?.route || record.page_name || "";
}

function isIncidence(record: ChangeRecord): boolean {
  return record.action_type.startsWith("INCIDENCIA_");
}

export const ChangeHistoryButton = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5 text-xs font-semibold">
        <History size={16} />
        <span className="hidden sm:inline">Historial</span>
      </Button>
      {open && <ChangeHistoryDialog open={open} onOpenChange={setOpen} />}
    </>
  );
};

function HistoryCard({ record }: { record: ChangeRecord }) {
  const actionType = record.action_type;
  const colorClass = ACTION_COLORS[actionType] || "bg-muted/50 border-border text-foreground";
  const IconComp = ACTION_ICONS[actionType] || Edit;
  const label = ACTION_LABELS[actionType] || actionType;
  const passengerName = extractPassengerName(record);
  const route = extractRoute(record);
  const isDelete = actionType.toLowerCase() === "delete";
  const isIncid = isIncidence(record);
  const dateStr = format(new Date(record.created_at), "d MMM, HH:mm", { locale: es });

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${colorClass}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <IconComp size={15} className="shrink-0" />
          <span className="text-xs font-bold uppercase">{label}</span>
          {!isIncid && (
            <span className="text-[11px] opacity-70">
              {PAGE_LABELS[record.page_name] || record.page_name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] opacity-70 shrink-0">
          <Calendar size={11} />
          {dateStr}
        </div>
      </div>

      {passengerName && !isIncid && (
        <div className="flex items-center gap-2">
          <User size={14} className="shrink-0 opacity-70" />
          <span className={`text-sm font-bold ${isDelete ? "line-through" : ""}`}>
            {passengerName}
          </span>
          {route && <span className="text-[11px] opacity-60">({route})</span>}
        </div>
      )}

      {isIncid && route && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">Ruta: {route}</span>
        </div>
      )}

      {!isIncid && !isDelete && <ChangesDetail record={record} />}
      {isDelete && <DeleteDetail record={record} />}
      {isIncid && <IncidenciaDetail record={record} />}
    </div>
  );
}

function ChangesDetail({ record }: { record: ChangeRecord }) {
  const changes = record.details?.changes;
  if (!changes) {
    const desc = record.details?.description;
    if (desc) return <p className="text-xs opacity-80">{desc}</p>;
    return null;
  }

  const changedFields = Object.entries(changes).filter(
    ([, v]) => v !== null && v !== undefined
  );
  if (changedFields.length === 0) return null;

  return (
    <div className="rounded-lg border bg-background/60 text-xs overflow-hidden">
      {changedFields.map(([field, val]: [string, any]) => (
        <div key={field} className="flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0">
          <span className="font-semibold min-w-[80px] text-foreground">{FIELD_LABELS[field] || field}</span>
          <span className="text-red-600 dark:text-red-400 line-through">{formatFieldValue(field, val.antes)}</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-green-700 dark:text-green-400 font-medium">{formatFieldValue(field, val.despues)}</span>
        </div>
      ))}
    </div>
  );
}

function DeleteDetail({ record }: { record: ChangeRecord }) {
  const snap = record.details?.snapshot_completo;
  if (!snap) return null;

  const fields: [string, string][] = [
    ["location", "Dirección"],
    ["contact_name", "Contacto"],
    ["contact_phone", "Teléfono"],
    ["route", "Ruta"],
  ];

  return (
    <div className="rounded-lg border bg-background/60 text-xs overflow-hidden">
      {fields.map(([key, label]) => {
        const val = snap[key];
        if (val === null || val === undefined) return null;
        return (
          <div key={key} className="flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0">
            <span className="font-semibold min-w-[80px] text-foreground">{label}</span>
            <span>{formatFieldValue(key, val)}</span>
          </div>
        );
      })}
    </div>
  );
}

function IncidenciaDetail({ record }: { record: ChangeRecord }) {
  const d = record.details;
  const mensaje = d?.mensaje;
  const respuesta = d?.respuesta;
  const creadoPor = d?.creado_por;
  const leidoPor = d?.leido_por;

  return (
    <div className="space-y-1">
      {creadoPor && (
        <p className="text-xs opacity-70">Por: <span className="font-medium">{creadoPor}</span></p>
      )}
      {leidoPor && (
        <p className="text-xs opacity-70">Leído por: <span className="font-medium">{leidoPor}</span></p>
      )}
      {mensaje && (
        <div className="rounded-lg border bg-background/60 px-3 py-2 text-xs">
          <span className="font-semibold">Mensaje:</span> {mensaje}
        </div>
      )}
      {respuesta && (
        <div className="rounded-lg border bg-background/60 px-3 py-2 text-xs">
          <span className="font-semibold">Respuesta:</span> {respuesta}
        </div>
      )}
    </div>
  );
}

function ChangeHistoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [records, setRecords] = useState<ChangeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("activity_log" as any)
      .select("*")
      .eq("user_code", ALLOWED_OPERATOR)
      .neq("action_type", "view")
      .gte("created_at", `${dateFrom}T00:00:00`)
      .lte("created_at", `${dateTo}T23:59:59`)
      .order("created_at", { ascending: false })
      .limit(500);

    let results = ((data as unknown) as ChangeRecord[]) || [];

    if (typeFilter === "passengers") {
      results = results.filter((r) => r.details?.table === "Pasajeros" || r.page_name === "passengers");
    } else if (typeFilter === "schedules") {
      results = results.filter((r) => r.details?.table === "Horarios/Viajes" || r.page_name === "schedule_trips");
    } else if (typeFilter === "incidencias") {
      results = results.filter((r) => isIncidence(r));
    }

    setRecords(results);
    setLoading(false);
  }, [dateFrom, dateTo, typeFilter]);

  useEffect(() => { if (open) fetchRecords(); }, [open, fetchRecords]);

  const clearRecords = async () => {
    if (records.length === 0) return;
    const confirmed = window.confirm(
      `¿Eliminar ${records.length} registro${records.length !== 1 ? "s" : ""} del historial?\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setClearing(true);
    try {
      const ids = records.map((r) => r.id);
      // Delete in batches of 100
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        await supabase
          .from("activity_log" as any)
          .delete()
          .in("id", batch);
      }
      setRecords([]);
    } catch (e) {
      console.error("Error clearing history:", e);
    } finally {
      setClearing(false);
    }
  };

  const exportCSV = () => {
    if (records.length === 0) return;
    const header = "Fecha;Acción;Tipo;Ruta;Pasajero;Detalle\n";
    const rows = records.map((r) => {
      const date = format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: es });
      const action = ACTION_LABELS[r.action_type] || r.action_type;
      const tipo = isIncidence(r) ? "Incidencia" : (PAGE_LABELS[r.page_name] || r.page_name);
      const route = extractRoute(r);
      const passenger = extractPassengerName(r) || "—";
      const changes = r.details?.changes;
      let detail = "—";
      if (changes) {
        detail = Object.entries(changes)
          .filter(([, v]) => v !== null && v !== undefined)
          .map(([k, v]: [string, any]) => `${FIELD_LABELS[k] || k}: ${formatFieldValue(k, v.antes)} → ${formatFieldValue(k, v.despues)}`)
          .join(" | ") || "—";
      } else if (r.details?.mensaje) {
        detail = r.details.mensaje;
      } else if (r.details?.respuesta) {
        detail = r.details.respuesta;
      } else if (r.details?.snapshot_completo) {
        detail = "Eliminado";
      }
      return `${date};${action};${tipo};${route};${passenger};${detail.replace(/;/g, ",")}`;
    }).join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historial_cambios_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History size={20} className="text-primary" />
            Historial de cambios — Aitor Del Cano
          </DialogTitle>
          <DialogDescription>
            Cambios realizados por el operador
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end border rounded-lg p-3 bg-muted/30">
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-[110px]">
            <Label className="text-[11px] mb-1 block">Desde</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex-1 min-w-[110px]">
            <Label className="text-[11px] mb-1 block">Hasta</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <Label className="text-[11px] mb-1 block">Tipo</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="passengers">Pasajeros</SelectItem>
                <SelectItem value="schedules">Horarios</SelectItem>
                <SelectItem value="incidencias">Incidencias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline" onClick={fetchRecords} className="h-8 text-xs">Buscar</Button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto min-h-0 space-y-2 pr-1">
          {loading ? (
            <p className="text-center text-muted-foreground text-sm py-8">Cargando...</p>
          ) : records.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No hay cambios en el período seleccionado</p>
          ) : (
            records.map((r) => <HistoryCard key={r.id} record={r} />)
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {records.length} registro{records.length !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={clearRecords} disabled={records.length === 0 || clearing} className="gap-1.5 text-xs">
              <Trash2 size={14} />
              {clearing ? "Borrando..." : "Borrar"}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={records.length === 0} className="gap-1.5 text-xs">
              <Download size={14} />
              CSV
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
