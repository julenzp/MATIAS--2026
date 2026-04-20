import { useState, useEffect } from "react";
import { Phone, Search, X, Loader2, Pencil, Check, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PhoneRow = {
  id: string;
  ruta: string;
  bus: string;
  nombre: string;
  puesto: string;
  linea: string | null;
  telefono: string | null;
};

type RouteEntry = {
  ruta: string;
  bus: string;
  crew: PhoneRow[];
};

function groupByRoute(rows: PhoneRow[]): RouteEntry[] {
  const map = new Map<string, RouteEntry>();
  for (const r of rows) {
    const key = `${r.ruta}||${r.bus}`;
    if (!map.has(key)) map.set(key, { ruta: r.ruta, bus: r.bus, crew: [] });
    map.get(key)!.crew.push(r);
  }
  return Array.from(map.values());
}

interface CompanyPhoneDirectoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CompanyPhoneDirectory = ({ open, onOpenChange }: CompanyPhoneDirectoryProps) => {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<RouteEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ nombre: string; telefono: string; linea: string }>({ nombre: "", telefono: "", linea: "" });
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    setLoading(true);
    supabase
      .from("company_phones" as any)
      .select("id, ruta, bus, nombre, puesto, linea, telefono")
      .eq("is_active", true)
      .order("ruta")
      .then(({ data: rows }) => {
        setData(groupByRoute((rows as unknown as PhoneRow[]) || []));
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!open) return;
    loadData();
  }, [open]);

  const startEdit = (member: PhoneRow) => {
    setEditingId(member.id);
    setEditForm({
      nombre: member.nombre,
      telefono: member.telefono || "",
      linea: member.linea || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const { error } = await (supabase.from("company_phones" as any) as any)
      .update({
        nombre: editForm.nombre.trim(),
        telefono: editForm.telefono.trim() || null,
        linea: editForm.linea.trim() || null,
      })
      .eq("id", editingId);

    setSaving(false);
    if (error) {
      toast.error("Error al guardar");
      console.error(error);
    } else {
      toast.success("Contacto actualizado");
      setEditingId(null);
      loadData();
    }
  };

  const normalise = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filtered = data.filter((entry) => {
    if (!search.trim()) return true;
    const q = normalise(search);
    if (normalise(entry.ruta).includes(q)) return true;
    if (normalise(entry.bus).includes(q)) return true;
    return entry.crew.some(
      (m) =>
        normalise(m.nombre).includes(q) ||
        (m.telefono && m.telefono.replace(/\s/g, "").includes(q.replace(/\s/g, ""))) ||
        (m.linea && m.linea.includes(q))
    );
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setSearch(""); setEditingId(null); } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center gap-3">
            <DialogTitle className="flex items-center gap-2 text-lg shrink-0">
              <Phone size={20} className="text-primary" />
              Teléfonos
            </DialogTitle>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar nombre, ruta, bus..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="h-[70vh] px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : (
            <div className="space-y-3 pt-3">
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Sin resultados para "{search}"</p>
              )}
              {filtered.map((entry, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">
                      {entry.ruta}
                    </span>
                    {entry.bus && (
                      <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        🚐 {entry.bus}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {entry.crew.map((member) => (
                      <div key={member.id}>
                        {editingId === member.id ? (
                          <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-muted/50 border border-primary/20">
                            <div className="flex items-center gap-2">
                              <Input
                                value={editForm.nombre}
                                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                                className="h-7 text-sm flex-1"
                                placeholder="Nombre"
                              />
                              <Input
                                value={editForm.telefono}
                                onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                                className="h-7 text-sm w-32"
                                placeholder="Teléfono"
                              />
                              <Input
                                value={editForm.linea}
                                onChange={(e) => setEditForm({ ...editForm, linea: e.target.value })}
                                className="h-7 text-sm w-16"
                                placeholder="Línea"
                              />
                            </div>
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={cancelEdit} disabled={saving}>
                                <XCircle size={14} className="mr-1" /> Cancelar
                              </Button>
                              <Button size="sm" className="h-7 px-2 text-xs" onClick={saveEdit} disabled={saving}>
                                {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Check size={14} className="mr-1" />}
                                Guardar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm group">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              member.puesto === "CONDUCTOR"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : member.puesto === "RESPONSABLE"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            }`}>
                              {member.puesto === "CONDUCTOR" ? "C" : member.puesto === "RESPONSABLE" ? "R" : "A"}
                            </span>
                            <span className="font-semibold text-foreground flex-1 truncate">{member.nombre}</span>
                            {member.telefono && (
                              <a href={`tel:${member.telefono.replace(/\s/g, "")}`} className="text-xs text-primary font-mono hover:underline whitespace-nowrap">
                                📞 {member.telefono}
                              </a>
                            )}
                            {member.linea && (
                              <span className="text-[10px] text-muted-foreground">L.{member.linea}</span>
                            )}
                            <button
                              onClick={() => startEdit(member)}
                              className="text-muted-foreground hover:text-primary p-0.5"
                              title="Editar contacto"
                            >
                              <Pencil size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
