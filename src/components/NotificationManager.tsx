import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Send, Eye, CheckCircle, AlertTriangle, Clock, User, Search, MessageSquareWarning } from "lucide-react";
import { useUnreadAlerts } from "@/hooks/useUnreadAlerts";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  route: string;
  message: string;
  priority: string;
  is_active: boolean;
  created_at: string;
}

interface Passenger {
  id: string;
  name: string;
  route: string;
  is_active: boolean;
}

interface PassengerNote {
  id: string;
  passenger_id: string;
  message: string;
  is_active: boolean;
  created_at: string;
  passengers?: Passenger;
}



interface NotificationRead {
  id: string;
  notification_id: string;
  route: string;
  device_id: string | null;
  read_at: string;
  user_agent: string | null;
}

const ROUTES = [
  { value: "ASPACE", label: "1. ASPACE INTXAURRONDO" },
  { value: "AMARAEN FINDE", label: "2. GUREAK, Amaraene FINDE" },
  { value: "BERMINGHAM", label: "3. MATIA BERMINGHAM" },
  { value: "FRAISORO", label: "4. MATIA FRAISORO" },
  { value: "FRAISORO_2", label: "5. MATIA FRAISORO 2" },
  { value: "IGELDO", label: "6. MATIA IGELDO" },
  { value: "LAMOROUSE", label: "7. MATIA LAMOROUSE" },
  { value: "LASARTE", label: "8. MATIA LASARTE" },
  { value: "MATIA", label: "9. MATIA REZOLA" },
  { value: "EGURTZEGI", label: "10. MATIA USURBIL" },
];

// Solo mostramos "Urgente" ya que todos los avisos de admin bloquean la app
const PRIORITIES = [
  { value: "urgent", label: "Urgente (bloquea app)", color: "text-red-600" },
];

export const NotificationManager = ({ hideTrigger = false }: { hideTrigger?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("send");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reads, setReads] = useState<NotificationRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Global unread alerts hook (works even when dialog is closed)
  const { unreadAlertCount, unreadAlerts, requestPermission } = useUnreadAlerts();

  // Listen for global event to open notifications panel
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('erbi:open-avisos', handler);
    return () => window.removeEventListener('erbi:open-avisos', handler);
  }, []);

  // Form state for route notifications
  const [selectedRoute, setSelectedRoute] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("urgent"); // Siempre urgente por defecto

  // State for user-specific notes
  const [passengerNotes, setPassengerNotes] = useState<PassengerNote[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [noteRoute, setNoteRoute] = useState("");
  const [notePassengerId, setNotePassengerId] = useState("");
  const [noteMessage, setNoteMessage] = useState("");
  const [passengerSearch, setPassengerSearch] = useState("");
  const [sendingNote, setSendingNote] = useState(false);

  // Request notification permission when dialog opens
  useEffect(() => {
    if (open) {
      requestPermission();
    }
  }, [open, requestPermission]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
      fetchReads();
      fetchPassengerNotes();
      fetchPassengers();

      // Subscribe to realtime reads
      const readsChannel = supabase
        .channel('admin-notification-reads')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notification_reads'
          },
          () => {
            fetchReads();
          }
        )
        .subscribe();

      // Subscribe to realtime notifications changes (for sync across tabs/devices)
      const notificationsChannel = supabase
        .channel('admin-notifications-sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'route_notifications'
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      // Subscribe to passenger notes changes
      const notesChannel = supabase
        .channel('admin-passenger-notes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'passenger_notes'
          },
          () => {
            fetchPassengerNotes();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(readsChannel);
        supabase.removeChannel(notificationsChannel);
        supabase.removeChannel(notesChannel);
      };
    }
  }, [open]);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("route_notifications")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const fetchReads = async () => {
    const { data, error } = await supabase
      .from("notification_reads")
      .select("*")
      .order("read_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setReads(data);
    }
  };

  const fetchPassengerNotes = async () => {
    const { data, error } = await supabase
      .from("passenger_notes")
      .select("*, passengers(*)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setPassengerNotes(data as PassengerNote[]);
    }
  };

  const fetchPassengers = async () => {
    const { data, error } = await supabase
      .from("passengers")
      .select("id, name, route, is_active")
      .eq("is_active", true)
      .order("name");

    if (!error && data) {
      setPassengers(data);
    }
  };

  const sendNotification = async () => {
    if (!selectedRoute || !message.trim()) {
      toast.error("Selecciona una ruta y escribe un mensaje");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from("route_notifications").insert({
        route: selectedRoute,
        message: message.trim(),
        priority,
      });

      if (error) throw error;

      toast.success(`Aviso enviado a ${selectedRoute}`);
      setMessage("");
      setSelectedRoute("");
      setPriority("normal");
      fetchNotifications();
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast.error("Error al enviar el aviso");
    } finally {
      setSending(false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      // Primero eliminar las lecturas asociadas
      await supabase
        .from("notification_reads")
        .delete()
        .eq("notification_id", id);
      
      // Luego eliminar la notificación (DELETE real, no update is_active)
      const { error } = await supabase
        .from("route_notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Aviso eliminado");
      // Actualizar estado local inmediatamente
      setNotifications(prev => prev.filter(n => n.id !== id));
      fetchReads(); // Refrescar lecturas
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Error al eliminar el aviso");
    }
  };

  const deleteRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notification_reads")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Confirmación eliminada");
      fetchReads();
    } catch (error) {
      console.error("Error deleting read:", error);
      toast.error("Error al eliminar la confirmación");
    }
  };

  const sendPassengerNote = async () => {
    if (!notePassengerId || !noteMessage.trim()) {
      toast.error("Selecciona un usuario y escribe un mensaje");
      return;
    }

    setSendingNote(true);
    try {
      const { error } = await supabase.from("passenger_notes").insert({
        passenger_id: notePassengerId,
        message: noteMessage.trim(),
      });

      if (error) throw error;

      const passenger = passengers.find(p => p.id === notePassengerId);
      toast.success(`Nota añadida a ${passenger?.name || 'usuario'}`);
      setNoteMessage("");
      setNotePassengerId("");
      setNoteRoute("");
      setPassengerSearch("");
      fetchPassengerNotes();
    } catch (error: any) {
      console.error("Error sending passenger note:", error);
      toast.error("Error al añadir la nota");
    } finally {
      setSendingNote(false);
    }
  };

  const deletePassengerNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from("passenger_notes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Nota eliminada");
      setPassengerNotes(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error("Error deleting passenger note:", error);
      toast.error("Error al eliminar la nota");
    }
  };

  // Get filtered passengers for the note form
  const filteredPassengersForNote = passengers.filter(p => {
    if (noteRoute && p.route !== noteRoute) return false;
    if (passengerSearch && !p.name.toLowerCase().includes(passengerSearch.toLowerCase())) return false;
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getReadCountForNotification = (notificationId: string) => {
    return reads.filter(r => r.notification_id === notificationId).length;
  };

  const getDeviceType = (userAgent: string | null): string => {
    if (!userAgent) return "Desconocido";
    if (/android/i.test(userAgent)) return "Android";
    if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
    if (/mobile/i.test(userAgent)) return "Móvil";
    return "Web";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "gap-2 relative",
              "border-red-500 bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            )}
          >
            <Bell size={20} className="text-white" />
            <span className="hidden sm:inline">Avisos</span>
            {unreadAlertCount > 0 && (
              <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-orange-500 text-white animate-pulse">
                {unreadAlertCount}
              </span>
            )}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell size={20} />
            Gestión de Avisos / Jakinarazpenak
          </DialogTitle>
          <DialogDescription>
            Envía avisos personalizados y consulta confirmaciones de lectura
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="send" className="gap-1 text-xs px-2">
              <Send size={14} />
              <span className="hidden sm:inline">Ruta</span>
            </TabsTrigger>
            <TabsTrigger value="user" className="gap-1 text-xs px-2">
              <User size={14} />
              <span className="hidden sm:inline">Usuario</span>
              {passengerNotes.length > 0 && (
                <span className="ml-1 text-[10px] bg-amber-500 text-white rounded-full px-1.5">{passengerNotes.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reads" className="gap-1 text-xs px-2">
              <Eye size={14} />
              <span className="hidden sm:inline">Confirm.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-6 mt-4">
            {/* New notification form */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus size={16} />
                Nuevo Aviso
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ruta" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTES.map((route) => (
                      <SelectItem key={route.value} value={route.value}>
                        {route.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className={p.color}>{p.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                placeholder="Escribe el mensaje del aviso..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />

              <Button
                onClick={sendNotification}
                disabled={sending || !selectedRoute || !message.trim()}
                className="w-full gap-2"
              >
                <Send size={16} />
                {sending ? "Enviando..." : "Enviar Aviso"}
              </Button>
            </div>

            {/* Active notifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Avisos Activos ({notifications.length})</h3>
                {unreadAlerts.size > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                    <AlertTriangle size={12} />
                    {unreadAlerts.size} sin leer +60min
                  </span>
                )}
              </div>
              
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Cargando...
                </p>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay avisos activos
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notifications.map((notification) => {
                    const readCount = getReadCountForNotification(notification.id);
                    const isUnreadAlert = unreadAlerts.has(notification.id);
                    const minutesSinceCreation = Math.floor(
                      (new Date().getTime() - new Date(notification.created_at).getTime()) / (1000 * 60)
                    );
                    
                    return (
                      <div
                        key={notification.id}
                        className={`p-3 border rounded-lg transition-all ${
                          isUnreadAlert 
                            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 ring-2 ring-orange-400/50' 
                            : 'bg-card'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {notification.route}
                          </span>
                          <span className={`text-xs ${
                            PRIORITIES.find(p => p.value === notification.priority)?.color || ""
                          }`}>
                            {PRIORITIES.find(p => p.value === notification.priority)?.label}
                          </span>
                          {readCount > 0 ? (
                            <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle size={10} />
                              {readCount} leído(s)
                            </span>
                          ) : isUnreadAlert ? (
                            <span className="text-xs bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                              <AlertTriangle size={10} />
                              ¡Sin leer! ({minutesSinceCreation} min)
                            </span>
                          ) : (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock size={10} />
                              Pendiente ({minutesSinceCreation} min)
                            </span>
                          )}
                        </div>
                        <p className="text-sm mb-1">{notification.message}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(notification.created_at)}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                          >
                            <Trash2 size={12} />
                            Borrar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* User-specific notes tab */}
          <TabsContent value="user" className="space-y-6 mt-4">
            {/* New user note form */}
            <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <h3 className="font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <MessageSquareWarning size={16} />
                Aviso Personal de Usuario
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Esta nota aparecerá como distintivo junto al nombre del usuario en el panel de administración.
              </p>

              {/* Route selector */}
              <Select value={noteRoute} onValueChange={(value) => {
                setNoteRoute(value);
                setNotePassengerId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="1. Seleccionar ruta" />
                </SelectTrigger>
                <SelectContent>
                  {ROUTES.map((route) => (
                    <SelectItem key={route.value} value={route.value}>
                      {route.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* User search and selection */}
              {noteRoute && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuario por nombre..."
                      value={passengerSearch}
                      onChange={(e) => setPassengerSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto border rounded-md">
                    {filteredPassengersForNote.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        No hay usuarios en esta ruta
                      </p>
                    ) : (
                      filteredPassengersForNote.slice(0, 10).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setNotePassengerId(p.id);
                            setPassengerSearch(p.name);
                          }}
                          className={cn(
                            "px-3 py-2 cursor-pointer hover:bg-accent transition-colors text-sm flex items-center gap-2",
                            notePassengerId === p.id && "bg-primary/10 text-primary font-medium"
                          )}
                        >
                          <User size={14} />
                          {p.name}
                          {notePassengerId === p.id && <CheckCircle size={14} className="ml-auto text-green-600" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Message */}
              {notePassengerId && (
                <Textarea
                  placeholder="Escribe el aviso/nota para este usuario..."
                  value={noteMessage}
                  onChange={(e) => setNoteMessage(e.target.value)}
                  rows={2}
                  className="border-amber-300 focus:border-amber-500"
                />
              )}

              <Button
                onClick={sendPassengerNote}
                disabled={sendingNote || !notePassengerId || !noteMessage.trim()}
                className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <MessageSquareWarning size={16} />
                {sendingNote ? "Guardando..." : "Añadir Nota de Usuario"}
              </Button>
            </div>

            {/* Active user notes */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <User size={16} />
                Notas Activas ({passengerNotes.length})
              </h3>
              
              {passengerNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay notas de usuario activas
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {passengerNotes.map((note) => {
                    const passenger = note.passengers;
                    return (
                      <div
                        key={note.id}
                        className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-semibold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                            <User size={10} />
                            {passenger?.name || "Usuario desconocido"}
                          </span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {passenger?.route || "Sin ruta"}
                          </span>
                        </div>
                        <p className="text-sm mb-1 text-amber-900 dark:text-amber-100">{note.message}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(note.created_at)}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deletePassengerNote(note.id)}
                            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                          >
                            <Trash2 size={12} />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reads" className="space-y-4 mt-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              Confirmaciones de Lectura
            </h3>
            
            {reads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay confirmaciones de lectura todavía
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {reads.map((read) => {
                  const notification = notifications.find(n => n.id === read.notification_id);
                  return (
                    <div
                      key={read.id}
                      className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {read.route}
                        </span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          {getDeviceType(read.user_agent)}
                        </span>
                      </div>
                      {notification && (
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          "{notification.message.substring(0, 50)}..."
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-mono text-green-700 dark:text-green-400">
                          🕐 Leído: {formatDate(read.read_at)}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRead(read.id)}
                          className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                        >
                          <Trash2 size={12} />
                          Borrar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
