import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showOperatorConfirmation } from '@/hooks/useOperatorConfirmation';

type PreviewTrip = {
  id: string;
  passenger_name: string;
  scheduled_time: string;
  pickup_location: string | null;
  sort_order: number;
  passenger_id: string | null;
};

type PendingChange = {
  tripId: string;
  field: 'scheduled_time' | 'pickup_location';
  oldValue: string;
  newValue: string;
};

type SchedulePreviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: string;
  sectionLabel: string;
  route: string;
  /** The trip being edited */
  editedTripId: string;
  /** Changes the operator wants to apply */
  changes: PendingChange[];
  onConfirmed: () => void;
};

export function SchedulePreviewModal({
  open,
  onOpenChange,
  section,
  sectionLabel,
  route,
  editedTripId,
  changes: initialChanges,
  onConfirmed,
}: SchedulePreviewModalProps) {
  const [sectionTrips, setSectionTrips] = useState<PreviewTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Track ALL pending time overrides (initial change + inline edits)
  const [timeOverrides, setTimeOverrides] = useState<Record<string, string>>({});
  // Track pickup_location overrides
  const [locationOverrides, setLocationOverrides] = useState<Record<string, string>>({});
  // Track which row is being inline-edited
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [tempTimeValue, setTempTimeValue] = useState('');

  // Load section trips when modal opens
  useEffect(() => {
    if (!open) return;
    loadSectionTrips();
  }, [open, section, route]);

  // Apply initial changes to overrides when they come in
  useEffect(() => {
    if (!open || initialChanges.length === 0) return;
    const times: Record<string, string> = {};
    const locations: Record<string, string> = {};
    for (const c of initialChanges) {
      if (c.field === 'scheduled_time') {
        times[c.tripId] = c.newValue;
      }
      if (c.field === 'pickup_location') {
        locations[c.tripId] = c.newValue;
      }
    }
    setTimeOverrides(times);
    setLocationOverrides(locations);
  }, [open, initialChanges]);

  const loadSectionTrips = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('schedule_trips')
      .select('id, scheduled_time, pickup_location, sort_order, passenger_id, passengers(name)')
      .eq('schedule_section', section)
      .eq('route', route)
      .eq('is_active', true)
      .order('scheduled_time');

    if (data) {
      setSectionTrips(
        data.map((t: any) => ({
          id: t.id,
          passenger_name: t.passengers?.name || 'Sin asignar',
          scheduled_time: t.scheduled_time,
          pickup_location: t.pickup_location,
          sort_order: t.sort_order,
          passenger_id: t.passenger_id,
        }))
      );
    }
    setLoading(false);
  };

  // Build the preview list with overrides applied, sorted by effective time
  const getPreviewRows = () => {
    const rows = sectionTrips.map((t) => {
      const effectiveTime = timeOverrides[t.id] ?? t.scheduled_time;
      const effectiveLocation = locationOverrides[t.id] ?? t.pickup_location;
      const isEdited = t.id === editedTripId;
      const hasTimeOverride = timeOverrides[t.id] !== undefined && timeOverrides[t.id] !== t.scheduled_time;
      const hasLocationOverride = locationOverrides[t.id] !== undefined && locationOverrides[t.id] !== (t.pickup_location || '');
      return {
        ...t,
        effectiveTime,
        effectiveLocation,
        isEdited,
        hasChange: hasTimeOverride || hasLocationOverride,
      };
    });

    // Sort by effective time
    rows.sort((a, b) => {
      const [hA, mA] = a.effectiveTime.split(':').map(Number);
      const [hB, mB] = b.effectiveTime.split(':').map(Number);
      return (hA * 60 + (mA || 0)) - (hB * 60 + (mB || 0));
    });

    // Find the edited trip's new sort position
    const editedIdx = rows.findIndex((r) => r.isEdited);

    return rows.map((r, idx) => ({
      ...r,
      newOrder: idx + 1,
      isAffected: !r.isEdited && editedIdx >= 0 && idx > editedIdx && !r.hasChange,
    }));
  };

  const startInlineEdit = (tripId: string, currentTime: string) => {
    setEditingTimeId(tripId);
    setTempTimeValue(currentTime);
  };

  const confirmInlineEdit = () => {
    if (!editingTimeId || !tempTimeValue.match(/^\d{1,2}:\d{2}$/)) {
      setEditingTimeId(null);
      return;
    }
    setTimeOverrides((prev) => ({ ...prev, [editingTimeId]: tempTimeValue }));
    setEditingTimeId(null);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      // Collect all changes to apply
      const updates: { id: string; scheduled_time?: string; pickup_location?: string }[] = [];
      const previewRows = getPreviewRows();

      for (const row of previewRows) {
        const update: any = { id: row.id };
        let hasUpdate = false;

        // Time change
        if (timeOverrides[row.id] !== undefined && timeOverrides[row.id] !== row.scheduled_time) {
          update.scheduled_time = timeOverrides[row.id];
          hasUpdate = true;
        }
        // Location change
        if (locationOverrides[row.id] !== undefined && locationOverrides[row.id] !== (row.pickup_location || '')) {
          update.pickup_location = locationOverrides[row.id];
          hasUpdate = true;
        }
        // Sort order change (new position after re-sorting)
        if (row.newOrder !== row.sort_order) {
          update.sort_order = row.newOrder;
          hasUpdate = true;
        }

        if (hasUpdate) updates.push(update);
      }

      // Apply all updates
      for (const u of updates) {
        const { id, ...data } = u;
        await supabase.from('schedule_trips').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
      }

      toast.success(`${updates.length} cambio${updates.length !== 1 ? 's' : ''} aplicado${updates.length !== 1 ? 's' : ''} en ${sectionLabel} ✓`, { duration: 4000 });
      showOperatorConfirmation({
        actionType: 'update',
        description: `Previsualización confirmada: ${updates.length} cambio(s) en ${sectionLabel}`,
        table: 'Horarios/Viajes',
        route,
      });

      onOpenChange(false);
      onConfirmed();
    } catch (err: any) {
      toast.error('Error al aplicar cambios: ' + (err?.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const previewRows = getPreviewRows();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye size={20} className="text-primary" />
            Así quedaría la ruta con este cambio
          </DialogTitle>
          <DialogDescription>
            Sección: <strong>{sectionLabel}</strong>. Puedes hacer clic en la hora de cualquier pasajero para ajustarla antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium text-muted-foreground w-12">Orden</th>
                  <th className="text-left p-2 font-medium text-muted-foreground w-20">Hora</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Pasajero</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Dirección</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => {
                  const bgClass = row.isEdited
                    ? 'bg-[#E8632A]/15'
                    : row.isAffected
                    ? 'bg-[#FFF3CD]'
                    : row.hasChange
                    ? 'bg-[#E8632A]/10'
                    : '';
                  const borderClass = row.isEdited ? 'border-l-4 border-l-[#E8632A]' : '';

                  return (
                    <tr key={row.id} className={`border-b ${bgClass} ${borderClass}`}>
                      <td className="p-2 font-mono text-xs text-muted-foreground">{row.newOrder}</td>
                      <td className="p-2">
                        {editingTimeId === row.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={tempTimeValue}
                              onChange={(e) => setTempTimeValue(e.target.value)}
                              className="h-7 w-16 text-xs font-mono px-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmInlineEdit();
                                if (e.key === 'Escape') setEditingTimeId(null);
                              }}
                            />
                            <button
                              onClick={confirmInlineEdit}
                              className="text-green-600 hover:text-green-800"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingTimeId(null)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="font-mono font-medium hover:underline cursor-pointer hover:text-primary transition-colors"
                            onClick={() => startInlineEdit(row.id, row.effectiveTime)}
                            title="Clic para editar hora"
                          >
                            {row.effectiveTime}
                            {(timeOverrides[row.id] && timeOverrides[row.id] !== row.scheduled_time) && (
                              <span className="text-[10px] text-muted-foreground ml-1 line-through">
                                {row.scheduled_time}
                              </span>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-2">
                        <span className={row.isEdited ? 'font-semibold text-[#E8632A]' : ''}>
                          {row.passenger_name}
                        </span>
                        {row.isEdited && (
                          <span className="ml-1.5 text-[10px] font-bold text-white bg-[#E8632A] px-1.5 py-0.5 rounded">
                            EDITADO
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground truncate max-w-[150px]">
                        {row.effectiveLocation || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="gap-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || loading}
            className="gap-1"
            style={{ backgroundColor: '#4DB86A', borderColor: '#4DB86A' }}
          >
            {saving ? 'Guardando...' : (
              <>
                <Check size={16} />
                Confirmar cambio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
