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

type Passenger = {
  id: string;
  name: string;
  route: string;
  location: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  is_active: boolean;
  trip_type: string | null;
};

type Operation = 'desactivar' | 'cambiar_ruta' | 'editar_contacto' | 'editar_direccion';

export function ModPasajeros() {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [routes, setRoutes] = useState<{ route_key: string; nombre: string }[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [operation, setOperation] = useState<Operation | ''>('');
  const [showImpact, setShowImpact] = useState(false);
  const [impactData, setImpactData] = useState<{ message: string; severity: 'amber' | 'red'; details: string[] }>({
    message: '',
    severity: 'amber',
    details: [],
  });
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [newRoute, setNewRoute] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const selectedPassenger = passengers.find((p) => p.id === selectedId);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [{ data: pax }, { data: rts }] = await Promise.all([
      supabase.from('passengers').select('id, name, route, location, contact_name, contact_phone, is_active, trip_type').eq('is_active', true).order('name'),
      supabase.from('rutas').select('route_key, nombre').eq('activo', true).order('nombre'),
    ]);
    if (pax) setPassengers(pax);
    if (rts) setRoutes(rts.filter((r) => r.route_key));
  };

  const analyzeImpact = async () => {
    if (!selectedPassenger || !operation) return;

    let message = '';
    let severity: 'amber' | 'red' = 'amber';
    const details: string[] = [];

    if (operation === 'desactivar') {
      const { count } = await supabase
        .from('schedule_trips')
        .select('id', { count: 'exact', head: true })
        .eq('passenger_id', selectedPassenger.id)
        .eq('is_active', true);

      message = `Este pasajero tiene ${count ?? 0} viajes programados activos`;
      if ((count ?? 0) > 0) {
        details.push('Se desactivarán los viajes programados asociados');
        details.push('Los registros de asistencia existentes no se modifican');
      }
    } else if (operation === 'cambiar_ruta') {
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from('attendance_records')
        .select('id', { count: 'exact', head: true })
        .eq('user_name', selectedPassenger.name)
        .eq('record_date', today);

      message = (count ?? 0) > 0
        ? `Hay ${count} registros de asistencia para hoy en la ruta actual`
        : 'No hay registros de asistencia para hoy en la ruta actual';

      const { count: tripCount } = await supabase
        .from('schedule_trips')
        .select('id', { count: 'exact', head: true })
        .eq('passenger_id', selectedPassenger.id)
        .eq('is_active', true);

      if ((tripCount ?? 0) > 0) {
        details.push(`${tripCount} viajes programados se actualizarán a la nueva ruta`);
      }
    } else if (operation === 'editar_contacto') {
      message = 'Se actualizará la información de contacto del pasajero';
    } else if (operation === 'editar_direccion') {
      message = 'Se actualizará la dirección del pasajero';

      const { count } = await supabase
        .from('schedule_trips')
        .select('id', { count: 'exact', head: true })
        .eq('passenger_id', selectedPassenger.id)
        .eq('is_active', true);

      if ((count ?? 0) > 0) {
        details.push(`La nueva dirección se reflejará en ${count} viajes programados`);
      }
    }

    setImpactData({ message, severity, details });
    setShowImpact(true);
  };

  const handleConfirm = async (motivo: string) => {
    if (!selectedPassenger || !operation) return;
    setSaving(true);

    try {
      if (operation === 'desactivar') {
        await supabase.from('passengers').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', selectedPassenger.id);
        // Deactivate associated trips
        await supabase.from('schedule_trips').update({ is_active: false, updated_at: new Date().toISOString() }).eq('passenger_id', selectedPassenger.id).eq('is_active', true);

        await logModificacion('passengers', selectedPassenger.id, 'is_active', 'true', 'false', motivo);
        toast.success(`Pasajero ${selectedPassenger.name} desactivado correctamente`);
      } else if (operation === 'cambiar_ruta') {
        if (!newRoute) { toast.error('Selecciona la nueva ruta'); setSaving(false); return; }
        const oldRoute = selectedPassenger.route;
        await supabase.from('passengers').update({ route: newRoute, updated_at: new Date().toISOString() }).eq('id', selectedPassenger.id);
        // Update trips to new route
        await supabase.from('schedule_trips').update({ route: newRoute, updated_at: new Date().toISOString() }).eq('passenger_id', selectedPassenger.id).eq('is_active', true);

        await logModificacion('passengers', selectedPassenger.id, 'route', oldRoute, newRoute, motivo);
        toast.success(`Ruta de ${selectedPassenger.name} cambiada a ${newRoute}`);
      } else if (operation === 'editar_contacto') {
        const updates: Record<string, string> = { updated_at: new Date().toISOString() };
        if (newContactName) updates.contact_name = newContactName;
        if (newContactPhone) updates.contact_phone = newContactPhone;

        await supabase.from('passengers').update(updates).eq('id', selectedPassenger.id);

        if (newContactName && newContactName !== (selectedPassenger.contact_name || '')) {
          await logModificacion('passengers', selectedPassenger.id, 'contact_name', selectedPassenger.contact_name || '', newContactName, motivo);
        }
        if (newContactPhone && newContactPhone !== (selectedPassenger.contact_phone || '')) {
          await logModificacion('passengers', selectedPassenger.id, 'contact_phone', selectedPassenger.contact_phone || '', newContactPhone, motivo);
        }
        toast.success(`Contacto de ${selectedPassenger.name} actualizado`);
      } else if (operation === 'editar_direccion') {
        const oldLoc = selectedPassenger.location || '';
        await supabase.from('passengers').update({ location: newLocation, updated_at: new Date().toISOString() }).eq('id', selectedPassenger.id);
        // Update pickup_location in trips
        await supabase.from('schedule_trips').update({ pickup_location: newLocation, updated_at: new Date().toISOString() }).eq('passenger_id', selectedPassenger.id).eq('is_active', true);

        await logModificacion('passengers', selectedPassenger.id, 'location', oldLoc, newLocation, motivo);
        toast.success(`Dirección de ${selectedPassenger.name} actualizada`);
      }

      resetForm();
      loadData();
    } catch (err: any) {
      toast.error('Error: ' + (err?.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedId('');
    setOperation('');
    setShowImpact(false);
    setNewRoute('');
    setNewContactName('');
    setNewContactPhone('');
    setNewLocation('');
  };

  const onSelectPassenger = (id: string) => {
    setSelectedId(id);
    setShowImpact(false);
    const p = passengers.find((x) => x.id === id);
    if (p) {
      setNewContactName(p.contact_name || '');
      setNewContactPhone(p.contact_phone || '');
      setNewLocation(p.location || '');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Modificar pasajero</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Selection */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Pasajero</Label>
            <Select value={selectedId} onValueChange={onSelectPassenger}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar pasajero..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {passengers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.route}
                  </SelectItem>
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
                <SelectItem value="desactivar">Desactivar pasajero</SelectItem>
                <SelectItem value="cambiar_ruta">Cambiar de ruta</SelectItem>
                <SelectItem value="editar_contacto">Editar contacto</SelectItem>
                <SelectItem value="editar_direccion">Editar dirección</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Operation-specific fields */}
        {selectedPassenger && operation === 'cambiar_ruta' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Nueva ruta</Label>
            <Select value={newRoute} onValueChange={setNewRoute}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar ruta destino..." />
              </SelectTrigger>
              <SelectContent>
                {routes.filter((r) => r.route_key !== selectedPassenger.route).map((r) => (
                  <SelectItem key={r.route_key!} value={r.route_key!}>
                    {r.nombre} ({r.route_key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedPassenger && operation === 'editar_contacto' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre de contacto</Label>
              <Input value={newContactName} onChange={(e) => setNewContactName(e.target.value)} placeholder="Nombre del contacto" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Teléfono de contacto</Label>
              <Input value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} placeholder="Teléfono" />
            </div>
          </div>
        )}

        {selectedPassenger && operation === 'editar_direccion' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Nueva dirección</Label>
            <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Dirección del pasajero" />
          </div>
        )}

        {/* Analyze impact button */}
        {selectedId && operation && !showImpact && (
          <button
            onClick={analyzeImpact}
            className="w-full text-sm font-medium py-2.5 rounded-lg border-2 border-dashed border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
          >
            Analizar impacto del cambio →
          </button>
        )}

        {/* Step 2: Impact + Confirm */}
        {showImpact && (
          <ConfirmStep onConfirm={handleConfirm} onCancel={resetForm} saving={saving}>
            <ImpactWarning
              severity={impactData.severity}
              message={impactData.message}
              details={impactData.details}
              showMatiaWarning={['desactivar', 'cambiar_ruta', 'editar_direccion'].includes(operation)}
            />
          </ConfirmStep>
        )}
      </CardContent>
    </Card>
  );
}
