import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImpactWarning } from './ImpactWarning';
import { ConfirmStep } from './ConfirmStep';
import { logModificacion } from './logModificacion';
import { ChevronDown, ChevronUp } from 'lucide-react';

type Trip = {
  id: string;
  scheduled_time: string;
  pickup_location: string | null;
  schedule_section: string;
  route: string;
  passenger_name: string;
  passenger_id: string | null;
};

type Operation = 'cambiar_hora' | 'cambiar_direccion' | 'desactivar_viaje';

export function ModHorarios() {
  const [routes, setRoutes] = useState<{ route_key: string; nombre: string }[]>([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [operation, setOperation] = useState<Operation | ''>('');
  const [showImpact, setShowImpact] = useState(false);
  const [impactExpanded, setImpactExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [affectedItems, setAffectedItems] = useState<string[]>([]);
  const [impactMessage, setImpactMessage] = useState('');

  // Editable
  const [newTime, setNewTime] = useState('');
  const [newPickup, setNewPickup] = useState('');

  const selectedTrip = trips.find((t) => t.id === selectedTripId);

  useEffect(() => {
    supabase.from('rutas').select('route_key, nombre').eq('activo', true).order('nombre').then(({ data }) => {
      if (data) setRoutes(data.filter((r) => r.route_key));
    });
  }, []);

  useEffect(() => {
    if (!selectedRoute) { setTrips([]); return; }
    loadTrips();
  }, [selectedRoute]);

  const loadTrips = async () => {
    const { data } = await supabase
      .from('schedule_trips')
      .select('id, scheduled_time, pickup_location, schedule_section, route, passenger_id, passengers(name)')
      .eq('route', selectedRoute)
      .eq('is_active', true)
      .order('schedule_section')
      .order('scheduled_time');

    if (data) {
      setTrips(data.map((t: any) => ({
        id: t.id,
        scheduled_time: t.scheduled_time,
        pickup_location: t.pickup_location,
        schedule_section: t.schedule_section,
        route: t.route,
        passenger_name: t.passengers?.name || 'Sin asignar',
        passenger_id: t.passenger_id,
      })));
    }
  };

  const analyzeImpact = async () => {
    if (!selectedTrip || !operation) return;
    const items: string[] = [];
    let msg = '';

    if (operation === 'cambiar_hora') {
      // Find trips in same section that come after
      const sameSection = trips.filter(
        (t) => t.schedule_section === selectedTrip.schedule_section && t.id !== selectedTrip.id
      );
      msg = `Este cambio puede afectar en cascada a viajes programados, registros de asistencia y avisos a familias vinculados a este horario. Revisa cada elemento antes de confirmar.`;

      items.push(`Viaje editado: ${selectedTrip.passenger_name} (${selectedTrip.scheduled_time} → ${newTime})`);
      for (const t of sameSection) {
        items.push(`Viaje en misma sección: ${t.passenger_name} a las ${t.scheduled_time}`);
      }

      // Check attendance
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from('attendance_records')
        .select('id', { count: 'exact', head: true })
        .eq('trip_id', selectedTrip.id)
        .eq('record_date', today);

      if ((count ?? 0) > 0) {
        items.push(`${count} registro(s) de asistencia de hoy para este viaje`);
      }
    } else if (operation === 'cambiar_direccion') {
      msg = 'Se actualizará la dirección de recogida de este viaje';
      items.push(`${selectedTrip.passenger_name}: "${selectedTrip.pickup_location || '(vacío)'}" → "${newPickup}"`);
    } else if (operation === 'desactivar_viaje') {
      msg = `Se desactivará el viaje de ${selectedTrip.passenger_name} a las ${selectedTrip.scheduled_time}`;
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from('attendance_records')
        .select('id', { count: 'exact', head: true })
        .eq('trip_id', selectedTrip.id)
        .eq('record_date', today);

      if ((count ?? 0) > 0) {
        items.push(`Este viaje tiene ${count} registro(s) de asistencia hoy`);
      }
    }

    setImpactMessage(msg);
    setAffectedItems(items);
    setShowImpact(true);
    if (operation === 'cambiar_hora') setImpactExpanded(true);
  };

  const handleConfirm = async (motivo: string) => {
    if (!selectedTrip || !operation) return;
    setSaving(true);

    try {
      if (operation === 'cambiar_hora') {
        if (!newTime.match(/^\d{1,2}:\d{2}$/)) { toast.error('Formato de hora inválido (HH:MM)'); setSaving(false); return; }
        const old = selectedTrip.scheduled_time;
        await supabase.from('schedule_trips').update({ scheduled_time: newTime, updated_at: new Date().toISOString() }).eq('id', selectedTrip.id);
        await logModificacion('schedule_trips', selectedTrip.id, 'scheduled_time', old, newTime, motivo);
        toast.success(`Hora de ${selectedTrip.passenger_name} cambiada de ${old} a ${newTime}`);
      } else if (operation === 'cambiar_direccion') {
        const old = selectedTrip.pickup_location || '';
        await supabase.from('schedule_trips').update({ pickup_location: newPickup, updated_at: new Date().toISOString() }).eq('id', selectedTrip.id);
        await logModificacion('schedule_trips', selectedTrip.id, 'pickup_location', old, newPickup, motivo);
        toast.success(`Dirección de ${selectedTrip.passenger_name} actualizada`);
      } else if (operation === 'desactivar_viaje') {
        await supabase.from('schedule_trips').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', selectedTrip.id);
        await logModificacion('schedule_trips', selectedTrip.id, 'is_active', 'true', 'false', motivo);
        toast.success(`Viaje de ${selectedTrip.passenger_name} desactivado`);
      }

      resetForm();
      loadTrips();
    } catch (err: any) {
      toast.error('Error: ' + (err?.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedTripId('');
    setOperation('');
    setShowImpact(false);
    setImpactExpanded(false);
    setNewTime('');
    setNewPickup('');
    setAffectedItems([]);
  };

  const onSelectTrip = (id: string) => {
    setSelectedTripId(id);
    setShowImpact(false);
    const t = trips.find((x) => x.id === id);
    if (t) {
      setNewTime(t.scheduled_time);
      setNewPickup(t.pickup_location || '');
    }
  };

  // Group trips by section for display
  const sections = [...new Set(trips.map((t) => t.schedule_section))];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Modificar horarios y viajes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Route selector */}
        <div className="space-y-1.5">
          <Label className="text-xs">Ruta</Label>
          <Select value={selectedRoute} onValueChange={(v) => { setSelectedRoute(v); resetForm(); }}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar ruta..." />
            </SelectTrigger>
            <SelectContent>
              {routes.map((r) => (
                <SelectItem key={r.route_key!} value={r.route_key!}>
                  {r.nombre} ({r.route_key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedRoute && trips.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Viaje</Label>
              <Select value={selectedTripId} onValueChange={onSelectTrip}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar viaje..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {sections.map((sec) => (
                    <div key={sec}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">{sec}</div>
                      {trips.filter((t) => t.schedule_section === sec).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.scheduled_time} — {t.passenger_name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Operación</Label>
              <Select value={operation} onValueChange={(v) => { setOperation(v as Operation); setShowImpact(false); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar operación..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cambiar_hora">Cambiar hora</SelectItem>
                  <SelectItem value="cambiar_direccion">Cambiar dirección de recogida</SelectItem>
                  <SelectItem value="desactivar_viaje">Desactivar viaje</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Operation fields */}
        {selectedTrip && operation === 'cambiar_hora' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Hora actual</Label>
              <Input value={selectedTrip.scheduled_time} disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nueva hora</Label>
              <Input value={newTime} onChange={(e) => setNewTime(e.target.value)} placeholder="HH:MM" />
            </div>
          </div>
        )}

        {selectedTrip && operation === 'cambiar_direccion' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Dirección actual</Label>
              <Input value={selectedTrip.pickup_location || '(vacío)'} disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nueva dirección</Label>
              <Input value={newPickup} onChange={(e) => setNewPickup(e.target.value)} placeholder="Nueva dirección" />
            </div>
          </div>
        )}

        {/* Analyze button */}
        {selectedTripId && operation && !showImpact && (
          <button
            onClick={analyzeImpact}
            className="w-full text-sm font-medium py-2.5 rounded-lg border-2 border-dashed border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
          >
            Analizar impacto del cambio →
          </button>
        )}

        {/* Impact + Confirm */}
        {showImpact && (
          <ConfirmStep onConfirm={handleConfirm} onCancel={resetForm} saving={saving}>
            <ImpactWarning
              severity={operation === 'cambiar_hora' ? 'red' : 'amber'}
              message={impactMessage}
              details={impactExpanded ? affectedItems : undefined}
              showMatiaWarning
            />
            {operation === 'cambiar_hora' && affectedItems.length > 0 && (
              <button
                onClick={() => setImpactExpanded(!impactExpanded)}
                className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {impactExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {impactExpanded ? 'Ocultar elementos afectados' : `Ver ${affectedItems.length} elementos afectados`}
              </button>
            )}
          </ConfirmStep>
        )}

        {selectedRoute && trips.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No hay viajes activos en esta ruta.</p>
        )}
      </CardContent>
    </Card>
  );
}
