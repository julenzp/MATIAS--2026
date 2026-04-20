import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Plus, Pencil, Trash2, Users, Clock, UserPlus, UserRoundPlus, ArrowUpDown, MapPin, Route, Search, UserX, UserCheck, MessageSquareWarning, ClipboardList, Download, Timer, Bot, AlertTriangle, ArrowRight, X, MessageSquare, Volume2 } from 'lucide-react';
import { useAlertSound } from '@/hooks/useAlertSound';
import { IncidenciasEmpresaPanel } from './IncidenciasEmpresaPanel';
import { TrackingAdminPanel } from './TrackingAdminPanel';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { showOperatorConfirmation } from '@/hooks/useOperatorConfirmation';
import { MonthlyExcelExport } from './MonthlyExcelExport';
import { SchedulePreviewModal } from './SchedulePreviewModal';
import { AttendanceStats } from './AttendanceStats';
import { ChangeHistoryButton } from './ChangeHistoryModal';
import { NotificationManager } from './NotificationManager';
import { usePassengerAttendanceStats } from '@/hooks/usePassengerAttendanceStats';
import { UserFilterCombobox } from './UserFilterCombobox';

type PassengerNote = {
  id: string;
  passenger_id: string;
  message: string;
  is_active: boolean;
  created_at: string;
};

type Passenger = {
  id: string;
  name: string;
  location: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  trip_type: string | null;
  is_active: boolean;
  registration_number: number | null;
  route: string;
};

type ScheduleTrip = {
  id: string;
  passenger_id: string | null;
  schedule_section: string;
  scheduled_time: string;
  pickup_location: string | null;
  sort_order: number;
  is_active: boolean;
  route: string;
  passengers?: Passenger;
};

const ROUTES = [
  { value: 'ASPACE', label: '1. ASPACE INTXAURRONDO' },
  { value: 'AMARAEN FINDE', label: '2. GUREAK, Amaraene FINDE' },
  { value: 'BERMINGHAM', label: '3. MATIA BERMINGHAM' },
  { value: 'FRAISORO', label: '4. MATIA FRAISORO' },
  { value: 'FRAISORO_2', label: '5. MATIA FRAISORO 2' },
  { value: 'IGELDO', label: '6. MATIA IGELDO' },
  { value: 'LAMOROUSE', label: '7. MATIA LAMOROUSE' },
  { value: 'LASARTE', label: '8. MATIA LASARTE' },
  { value: 'MATIA', label: '9. MATIA REZOLA' },
  { value: 'EGURTZEGI', label: '10. MATIA USURBIL' },
  { value: 'ARGIXAO_1', label: '11. MATIA ARGIXAO BUS 1' },
  { value: 'ARGIXAO_2', label: '12. MATIA ARGIXAO BUS 2' },
];

const SECTIONS = [
  { value: 'morning_first', label: 'Mañana - 1er viaje' },
  { value: 'morning_second', label: 'Mañana - 2do viaje' },
  { value: 'morning_third', label: 'Mañana - 3er viaje' },
  { value: 'afternoon_first', label: 'Tarde - 1er viaje' },
  { value: 'afternoon_second', label: 'Tarde - 2do viaje' },
  { value: 'afternoon_third', label: 'Tarde - 3er viaje' },
];

const EGURTZEGI_SECTIONS = [
  { value: 'EGURTZEGI_MORNING_1', label: 'Mañana - 1er viaje' },
  { value: 'EGURTZEGI_MORNING_2', label: 'Mañana - 2do viaje' },
  { value: 'EGURTZEGI_MORNING_3', label: 'Mañana - 3er viaje' },
  { value: 'EGURTZEGI_AFTERNOON_1', label: 'Tarde - 1er viaje' },
  { value: 'EGURTZEGI_AFTERNOON_2', label: 'Tarde - 2do viaje' },
  { value: 'EGURTZEGI_AFTERNOON_3', label: 'Tarde - 3er viaje' },
];

const EGILUZE_SECTIONS = [
  { value: 'EGILUZE_MORNING_1', label: 'Mañana - 1er viaje' },
  { value: 'EGILUZE_AFTERNOON_1', label: 'Tarde - 1er viaje (14:45)' },
  { value: 'EGILUZE_AFTERNOON_2', label: 'Tarde - 2do viaje (16:00)' },
];

const BERMINGHAM_SECTIONS = [
  { value: 'BERMINGHAM_MORNING_1', label: 'Mañana - 1er viaje' },
  { value: 'BERMINGHAM_MORNING_2', label: 'Mañana - 2do viaje' },
  { value: 'BERMINGHAM_AFTERNOON_1', label: 'Tarde - 1er viaje' },
  { value: 'BERMINGHAM_AFTERNOON_2', label: 'Tarde - 2do viaje' },
];

const LASARTE_SECTIONS = [
  { value: 'LASARTE_MORNING_1', label: 'Mañana - viaje' },
  { value: 'LASARTE_AFTERNOON_1', label: 'Tarde - viaje' },
];

const LAMOROUSE_SECTIONS = [
  { value: 'LAMOROUSE_MORNING_1', label: 'Mañana - 1er viaje' },
  { value: 'LAMOROUSE_MORNING_2', label: 'Mañana - 2do viaje' },
  { value: 'LAMOROUSE_AFTERNOON_1', label: 'Tarde - 1er viaje' },
  { value: 'LAMOROUSE_AFTERNOON_2', label: 'Tarde - 2do viaje' },
];

const IGELDO_SECTIONS = [
  { value: 'IGELDO_MORNING_1', label: 'Mañana - viaje' },
  { value: 'IGELDO_AFTERNOON_1', label: 'Tarde - viaje' },
];

const FRAISORO_SECTIONS = [
  { value: 'FRAISORO_MORNING_1', label: 'Mañana - 1º viaje' },
  { value: 'FRAISORO_MORNING_2', label: 'Mañana - 2º viaje' },
  { value: 'FRAISORO_AFTERNOON_1', label: 'Tarde - 1º viaje' },
  { value: 'FRAISORO_AFTERNOON_2', label: 'Tarde - 2º viaje' },
];

const FRAISORO_2_SECTIONS = [
  { value: 'FRAISORO_2_MORNING_1', label: 'Mañana - 1º viaje' },
  { value: 'FRAISORO_2_MORNING_2', label: 'Mañana - 2º viaje' },
  { value: 'FRAISORO_2_AFTERNOON_1', label: 'Tarde - 1º viaje' },
  { value: 'FRAISORO_2_AFTERNOON_2', label: 'Tarde - 2º viaje' },
];

const ARGIXAO_1_SECTIONS = [
  { value: 'ARGIXAO_1_MORNING_1', label: 'Mañana - 1er viaje' },
  { value: 'ARGIXAO_1_MORNING_2', label: 'Mañana - 2do viaje' },
  { value: 'ARGIXAO_1_MORNING_3', label: 'Mañana - 3er viaje' },
  { value: 'ARGIXAO_1_AFTERNOON_1', label: 'Tarde - 1er viaje' },
  { value: 'ARGIXAO_1_AFTERNOON_2', label: 'Tarde - 2do viaje' },
  { value: 'ARGIXAO_1_AFTERNOON_3', label: 'Tarde - 3er viaje' },
];

const ARGIXAO_2_SECTIONS = [
  { value: 'ARGIXAO_2_MORNING_1', label: 'Mañana - 1er viaje' },
  { value: 'ARGIXAO_2_MORNING_2', label: 'Mañana - 2do viaje' },
  { value: 'ARGIXAO_2_AFTERNOON_1', label: 'Tarde - 1er viaje' },
  { value: 'ARGIXAO_2_AFTERNOON_2', label: 'Tarde - 2do viaje' },
];

// Secciones disponibles por ruta.
// Nota: ASPACE y AMARAEN FINDE usan secciones legacy (morning_first/second, afternoon_first/second)
// para mantener compatibilidad con los datos existentes.
const getRouteSections = (route: string) => {
  if (route === 'EGURTZEGI') return EGURTZEGI_SECTIONS;
  if (route === 'EGILUZE') return EGILUZE_SECTIONS;
  if (route === 'BERMINGHAM') return BERMINGHAM_SECTIONS;
  if (route === 'LASARTE') return LASARTE_SECTIONS;
  if (route === 'LAMOROUSE') return LAMOROUSE_SECTIONS;
  if (route === 'IGELDO') return IGELDO_SECTIONS;
  if (route === 'FRAISORO') return FRAISORO_SECTIONS;
  if (route === 'FRAISORO_2') return FRAISORO_2_SECTIONS;
  if (route === 'ARGIXAO_1') return ARGIXAO_1_SECTIONS;
  if (route === 'ARGIXAO_2') return ARGIXAO_2_SECTIONS;
  return SECTIONS;
};

// En rutas con turnos fijos, garantizamos que siempre existan los mínimos imprescindibles.
const enforceRequiredSections = (route: string, sections: string[]) => {
  if (route === 'EGURTZEGI') {
    return ['EGURTZEGI_MORNING_1', 'EGURTZEGI_MORNING_2', 'EGURTZEGI_MORNING_3', 'EGURTZEGI_AFTERNOON_1', 'EGURTZEGI_AFTERNOON_2', 'EGURTZEGI_AFTERNOON_3'];
  }
  if (route === 'BERMINGHAM') {
    return ['BERMINGHAM_MORNING_1', 'BERMINGHAM_MORNING_2', 'BERMINGHAM_AFTERNOON_1', 'BERMINGHAM_AFTERNOON_2'];
  }
  if (route === 'LASARTE') {
    return ['LASARTE_MORNING_1', 'LASARTE_AFTERNOON_1'];
  }
  if (route === 'LAMOROUSE') {
    return ['LAMOROUSE_MORNING_1', 'LAMOROUSE_MORNING_2', 'LAMOROUSE_AFTERNOON_1', 'LAMOROUSE_AFTERNOON_2'];
  }
  if (route === 'IGELDO') {
    return ['IGELDO_MORNING_1', 'IGELDO_AFTERNOON_1'];
  }
  if (route === 'FRAISORO') {
    return ['FRAISORO_MORNING_1', 'FRAISORO_MORNING_2', 'FRAISORO_AFTERNOON_1', 'FRAISORO_AFTERNOON_2'];
  }
  if (route === 'FRAISORO_2') {
    return ['FRAISORO_2_MORNING_1', 'FRAISORO_2_MORNING_2', 'FRAISORO_2_AFTERNOON_1', 'FRAISORO_2_AFTERNOON_2'];
  }
  if (route === 'ARGIXAO_1') {
    return ['ARGIXAO_1_MORNING_1', 'ARGIXAO_1_MORNING_2', 'ARGIXAO_1_MORNING_3', 'ARGIXAO_1_AFTERNOON_1', 'ARGIXAO_1_AFTERNOON_2', 'ARGIXAO_1_AFTERNOON_3'];
  }
  if (route === 'ARGIXAO_2') {
    return ['ARGIXAO_2_MORNING_1', 'ARGIXAO_2_MORNING_2', 'ARGIXAO_2_AFTERNOON_1', 'ARGIXAO_2_AFTERNOON_2'];
  }
  if (route === 'ASPACE') {
    return ['morning_first', 'afternoon_first'];
  }
  if (route === 'AMARAEN FINDE') {
    return ['morning_first', 'morning_second', 'morning_third', 'afternoon_first', 'afternoon_second', 'afternoon_third'];
  }
  return sections;
};

export function AdminPanel({ hideTrigger = false }: { hideTrigger?: boolean } = {}) {
  const { isAdmin, isMatia } = useAuth();
  const { unlockAndPlay: testAlertSound } = useAlertSound();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [trips, setTrips] = useState<ScheduleTrip[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [usersOnlyMode, setUsersOnlyMode] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("passengers");
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null);
  const [editingTrip, setEditingTrip] = useState<ScheduleTrip | null>(null);
  const [isPassengerDialogOpen, setIsPassengerDialogOpen] = useState(false);
  const [isTripDialogOpen, setIsTripDialogOpen] = useState(false);
  const [isInsertToRouteDialogOpen, setIsInsertToRouteDialogOpen] = useState(false);
  const [insertRouteSection, setInsertRouteSection] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Schedule preview modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewModalSection, setPreviewModalSection] = useState('');
  const [previewModalSectionLabel, setPreviewModalSectionLabel] = useState('');
  const [previewModalRoute, setPreviewModalRoute] = useState('');
  const [previewModalTripId, setPreviewModalTripId] = useState('');
  const [previewModalChanges, setPreviewModalChanges] = useState<{ tripId: string; field: 'scheduled_time' | 'pickup_location'; oldValue: string; newValue: string }[]>([]);

  // Assign schedule from user card state
  const [isAssignScheduleDialogOpen, setIsAssignScheduleDialogOpen] = useState(false);
  const [assignSchedulePassenger, setAssignSchedulePassenger] = useState<Passenger | null>(null);

  // Passenger notes state
  const [passengerNotes, setPassengerNotes] = useState<PassengerNote[]>([]);
  const [viewingNotePassenger, setViewingNotePassenger] = useState<Passenger | null>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  // Absence history state
  type AbsenceRecord = {
    id: string;
    record_date: string;
    route: string | null;
    scheduled_time: string;
    trip_id: string;
  };
  type LateRecord = {
    id: string;
    record_date: string;
    route: string | null;
    scheduled_time: string;
    actual_time: string | null;
  };
  const [viewingAbsencePassenger, setViewingAbsencePassenger] = useState<Passenger | null>(null);
  const [isAbsenceHistoryOpen, setIsAbsenceHistoryOpen] = useState(false);
  const [absenceHistory, setAbsenceHistory] = useState<AbsenceRecord[]>([]);
  const [lateHistory, setLateHistory] = useState<LateRecord[]>([]);
  const [isLoadingAbsences, setIsLoadingAbsences] = useState(false);
  const [absencePeriodFilter, setAbsencePeriodFilter] = useState<string>('all');
  const [historyMode, setHistoryMode] = useState<'absences' | 'lates'>('absences');

  // AI schedule adjustment confirmation state
  type ScheduleAdjustment = {
    trip_id: string;
    passenger_name: string;
    old_time: string;
    new_time: string;
    reason: string;
  };
  type ScheduleUnchanged = {
    trip_id: string;
    passenger_name: string;
    time: string;
  };
  const [isAiAdjustDialogOpen, setIsAiAdjustDialogOpen] = useState(false);
  const [isAiEstimating, setIsAiEstimating] = useState(false);
  const [aiAdjustments, setAiAdjustments] = useState<ScheduleAdjustment[]>([]);
  const [aiUnchanged, setAiUnchanged] = useState<ScheduleUnchanged[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [pendingAiSaveData, setPendingAiSaveData] = useState<{
    editingPassenger: Passenger;
    passengerData: any;
    regNum: number;
    enforcedRoutes: string[];
    currentTrips: ScheduleTrip[];
    routesToAdd: string[];
    routesToRemove: string[];
  } | null>(null);

  // Collision dialog state
  type CollisionPreviewRow = {
    name: string;
    currentTime: string;
    newTime: string;
    isNew?: boolean;
    willMove?: boolean;
  };
  type CollisionData = {
    section: string;
    route: string;
    newTime: string;
    insertPosition: number;
    interval: number;
    passengerId: string;
    location: string | null;
    sectionTrips: ScheduleTrip[];
    previewRows: CollisionPreviewRow[];
    pendingSections: string[]; // remaining sections after this one
    customTimes: Record<string, string>;
    registrationNumber: number;
    shouldMaintainCorrelation: boolean;
    passengerName: string;
    isEdit?: boolean;
    editTripId?: string;
  };
  const [collisionDialogOpen, setCollisionDialogOpen] = useState(false);
  const [collisionData, setCollisionData] = useState<CollisionData | null>(null);

  // Search and filter states
  const [passengerSearchName, setPassengerSearchName] = useState('');
  const [tripSearchName, setTripSearchName] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('');
  // Search route filter: 'current' uses selectedRouteFilter, 'all' searches all routes, or a specific route value
  const [passengerSearchRouteFilter, setPassengerSearchRouteFilter] = useState<string>('current');
  // User filter: filter by a specific user across all routes
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('');

  // Function to reset all filters to default values (empty/blank state)
  const resetFilters = () => {
    setPassengerSearchName('');
    setTripSearchName('');
    setSelectedRouteFilter('');
    setPassengerSearchRouteFilter('current');
    setSelectedUserFilter('');
  };

  // Handle panel open/close - reset filters when closing
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetFilters();
      setUsersOnlyMode(false);
    }
  };

  // Listen for event to open users-only view from AI Erbi
  useEffect(() => {
    const handler = () => {
      setUsersOnlyMode(true);
      setIsOpen(true);
    };
    window.addEventListener('erbi:open-users', handler);
    return () => window.removeEventListener('erbi:open-users', handler);
  }, []);

  // Listen for event to open incidencias tab from home alert
  useEffect(() => {
    const handler = () => {
      setUsersOnlyMode(false);
      setActiveTab("incidencias");
      setIsOpen(true);
    };
    window.addEventListener('erbi:open-incidencias', handler);
    return () => window.removeEventListener('erbi:open-incidencias', handler);
  }, []);
  // Attendance stats hook - only fetch when panel is open to avoid unnecessary queries on page load
  const { getStatsForPassenger } = usePassengerAttendanceStats(isOpen ? selectedRouteFilter : '__SKIP__');

  // Form states
  const [passengerForm, setPassengerForm] = useState({
    name: '',
    location: '',
    contact_name: '',
    contact_phone: '',
    trip_type: '' as '' | 'S' | 'B',
    registration_number: null as number | null,
  });
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>(['morning_first', 'morning_second', 'afternoon_first', 'afternoon_second']);
  const [routeCustomTimes, setRouteCustomTimes] = useState<Record<string, string>>({});
  const [maintainCorrelation, setMaintainCorrelation] = useState(true);
  const [maxRegistrationNumber, setMaxRegistrationNumber] = useState(0);

  // Keep max registration number in sync per route (ACTIVE users only)
  useEffect(() => {
    setMaxRegistrationNumber(getMaxRegNumberForRoute(selectedRouteFilter, passengers));
  }, [selectedRouteFilter, passengers]);

  const [tripForm, setTripForm] = useState({
    passenger_id: '',
    schedule_section: 'morning_first',
    scheduled_time: '',
    pickup_location: '',
  });

  // State for location autocomplete suggestions
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isNewLocation, setIsNewLocation] = useState(false);

  // Helper function to parse time string to minutes
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };

  // Helper function to convert minutes to time string (always HH:MM format)
  const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Detect interval between consecutive trips at DIFFERENT locations in a section
  const detectInterval = (sectionTrips: ScheduleTrip[]): number => {
    if (sectionTrips.length < 2) return 5; // Default to 5 minutes
    
    const sortedTrips = [...sectionTrips].sort((a, b) => 
      timeToMinutes(a.scheduled_time) - timeToMinutes(b.scheduled_time)
    );
    
    const intervals: number[] = [];
    for (let i = 1; i < sortedTrips.length; i++) {
      const diff = timeToMinutes(sortedTrips[i].scheduled_time) - timeToMinutes(sortedTrips[i - 1].scheduled_time);
      // Only count intervals between different locations (same location = same stop = 0 min)
      const sameLocation = sortedTrips[i].pickup_location && sortedTrips[i - 1].pickup_location &&
        sortedTrips[i].pickup_location?.trim().toLowerCase() === sortedTrips[i - 1].pickup_location?.trim().toLowerCase();
      if (diff > 0 && diff <= 15 && !sameLocation) {
        intervals.push(diff);
      }
    }
    
    if (intervals.length === 0) return 5;
    
    // Return most common interval
    const counts: Record<number, number> = {};
    intervals.forEach(i => { counts[i] = (counts[i] || 0) + 1; });
    return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
  };

  // Adjust consecutive times after a specific trip - location-aware
  const adjustConsecutiveTimes = async (
    section: string, 
    changedTripId: string, 
    newTime: string,
    route: string
  ) => {
    const { data: freshTrips } = await supabase
      .from('schedule_trips')
      .select('*, passengers(*)')
      .eq('schedule_section', section)
      .eq('route', route)
      .eq('is_active', true)
      .order('scheduled_time');
    
    if (!freshTrips || freshTrips.length === 0) return;
    
    const sectionTrips = freshTrips as ScheduleTrip[];
    const sortedTrips = [...sectionTrips].sort((a, b) => 
      timeToMinutes(a.scheduled_time) - timeToMinutes(b.scheduled_time)
    );
    
    const changedIndex = sortedTrips.findIndex(t => t.id === changedTripId);
    if (changedIndex === -1) return;
    
    const interval = detectInterval(sectionTrips);
    let currentTime = timeToMinutes(newTime);
    let prevLocation = sortedTrips[changedIndex].pickup_location?.trim().toLowerCase() || '';
    
    // Update all trips after the changed one, considering locations
    for (let i = changedIndex + 1; i < sortedTrips.length; i++) {
      const trip = sortedTrips[i];
      const tripLocation = trip.pickup_location?.trim().toLowerCase() || '';
      
      // Only increment time if location is different from the previous trip
      if (tripLocation !== prevLocation || !tripLocation) {
        currentTime += interval;
      }
      // else: same location = same time (bus picks up multiple passengers at same stop)
      
      await supabase
        .from('schedule_trips')
        .update({ scheduled_time: minutesToTime(currentTime) })
        .eq('id', trip.id);
      
      prevLocation = tripLocation;
    }
    
    await recalculateSectionSchedule(section, route);
  };

  // Default start times for each section
  const DEFAULT_TIMES: Record<string, string> = {
    'morning_first': '8:00',
    'morning_second': '9:30',
    'morning_third': '10:20',
    'afternoon_first': '14:00',
    'afternoon_second': '16:00',
    'afternoon_third': '16:55',
    // EGURTZEGI sections
    'EGURTZEGI_MORNING_1': '8:05',
    'EGURTZEGI_MORNING_2': '9:20',
    'EGURTZEGI_MORNING_3': '10:05',
    'EGURTZEGI_AFTERNOON_1': '16:05',
    'EGURTZEGI_AFTERNOON_2': '16:25',
    'EGURTZEGI_AFTERNOON_3': '17:25',
    // BERMINGHAM sections
    'BERMINGHAM_MORNING_1': '8:00',
    'BERMINGHAM_MORNING_2': '9:30',
    'BERMINGHAM_AFTERNOON_1': '14:00',
    'BERMINGHAM_AFTERNOON_2': '16:00',
    // LASARTE sections
    'LASARTE_MORNING_1': '8:00',
    'LASARTE_MORNING_2': '9:30',
    'LASARTE_AFTERNOON_1': '14:00',
    'LASARTE_AFTERNOON_2': '16:00',
    // IGELDO sections
    'IGELDO_MORNING_1': '10:15',
    'IGELDO_AFTERNOON_1': '17:15',
    // FRAISORO sections
    'FRAISORO_MORNING_1': '08:00',
    'FRAISORO_MORNING_2': '09:30',
    'FRAISORO_AFTERNOON_1': '16:10',
    'FRAISORO_AFTERNOON_2': '17:45',
    // FRAISORO_2 sections
    'FRAISORO_2_MORNING_1': '08:00',
    'FRAISORO_2_MORNING_2': '09:30',
    'FRAISORO_2_AFTERNOON_1': '16:10',
    'FRAISORO_2_AFTERNOON_2': '17:45',
    // ARGIXAO_1 sections
    'ARGIXAO_1_MORNING_1': '09:30',
    'ARGIXAO_1_MORNING_2': '10:15',
    'ARGIXAO_1_MORNING_3': '11:00',
    'ARGIXAO_1_AFTERNOON_1': '18:40',
    'ARGIXAO_1_AFTERNOON_2': '18:50',
    'ARGIXAO_1_AFTERNOON_3': '19:30',
    // ARGIXAO_2 sections
    'ARGIXAO_2_MORNING_1': '10:30',
    'ARGIXAO_2_MORNING_2': '11:10',
    'ARGIXAO_2_AFTERNOON_1': '18:45',
    'ARGIXAO_2_AFTERNOON_2': '19:25',
  };

  // Calculate time for a passenger based on their position (registration number)
  const calculateTimeForPosition = (section: string, position: number, allTrips: ScheduleTrip[]): string => {
    const sectionTrips = allTrips.filter(t => t.schedule_section === section && t.is_active);
    
    if (sectionTrips.length === 0) {
      return DEFAULT_TIMES[section] || '8:00';
    }
    
    const interval = detectInterval(sectionTrips);
    const sortedTrips = [...sectionTrips].sort((a, b) => a.sort_order - b.sort_order);
    
    // If inserting at position 1 or before all existing
    if (position <= 1 || sortedTrips.length === 0) {
      return DEFAULT_TIMES[section] || '8:00';
    }
    
    // Find the trip before this position
    const tripBefore = sortedTrips.find((_, idx) => idx === position - 2);
    if (tripBefore) {
      return minutesToTime(timeToMinutes(tripBefore.scheduled_time) + interval);
    }
    
    // If position is beyond current list, use last time + interval
    const lastTrip = sortedTrips[sortedTrips.length - 1];
    return minutesToTime(timeToMinutes(lastTrip.scheduled_time) + interval);
  };

  // Adjust all trips after a specific sort_order in a section
  const adjustTripsAfterPosition = async (section: string, afterSortOrder: number, newTripsData: ScheduleTrip[]) => {
    const sectionTrips = newTripsData.filter(t => t.schedule_section === section && t.is_active);
    const sortedTrips = [...sectionTrips].sort((a, b) => a.sort_order - b.sort_order);
    const interval = detectInterval(sectionTrips);
    
    const startIndex = sortedTrips.findIndex(t => t.sort_order === afterSortOrder);
    if (startIndex === -1) return;
    
    let currentTime = timeToMinutes(sortedTrips[startIndex].scheduled_time);
    
    for (let i = startIndex + 1; i < sortedTrips.length; i++) {
      currentTime += interval;
      await supabase
        .from('schedule_trips')
        .update({ scheduled_time: minutesToTime(currentTime) })
        .eq('id', sortedTrips[i].id);
    }
  };

  // Recalculate all sort_orders for a section based on scheduled_time order
  const recalculateSectionSchedule = async (section: string, route: string) => {
    const { data: sectionTrips } = await supabase
      .from('schedule_trips')
      .select('*, passengers(*)')
      .eq('schedule_section', section)
      .eq('route', route)
      .eq('is_active', true)
      .order('scheduled_time');
    
    if (!sectionTrips || sectionTrips.length === 0) return;
    
    // Update each trip with correct sort_order based on time order
    for (let i = 0; i < sectionTrips.length; i++) {
      const trip = sectionTrips[i];
      await supabase
        .from('schedule_trips')
        .update({ sort_order: i + 1 })
        .eq('id', trip.id);
    }
  };

  // Build collision preview rows for a section
  const buildCollisionPreview = (
    sectionTrips: ScheduleTrip[],
    insertPosition: number,
    newTime: string,
    interval: number,
    passengerName: string
  ): CollisionPreviewRow[] => {
    const rows: CollisionPreviewRow[] = [];
    const newTimeMinutes = timeToMinutes(newTime);

    for (let i = 0; i < sectionTrips.length; i++) {
      const trip = sectionTrips[i];
      const name = trip.passengers?.name || 'Sin nombre';
      const currentTime = trip.scheduled_time;
      const pos = i + 1; // 1-based
      if (pos >= insertPosition) {
        // This trip will be pushed: its new time = previous time + interval
        const shiftedTime = minutesToTime(newTimeMinutes + (pos - insertPosition + 1) * interval);
        rows.push({ name, currentTime, newTime: shiftedTime, willMove: true });
      } else {
        rows.push({ name, currentTime, newTime: currentTime });
      }
    }

    // Insert the new user row at the correct visual position
    rows.splice(insertPosition - 1, 0, {
      name: passengerName,
      currentTime: '—',
      newTime,
      isNew: true,
    });

    return rows;
  };

  // Execute the actual insertion of a trip into a section (shared by direct insert and collision dialog)
  const executeInsertTrip = async (
    passengerId: string,
    location: string | null,
    section: string,
    route: string,
    newTime: string,
    insertPosition: number,
    sectionTrips: ScheduleTrip[],
    interval: number,
    shouldMaintainCorrelation: boolean,
    adjustExisting: boolean // true = push times, false = just insert
  ) => {
    // Shift sort_orders
    const tripsToShift = sectionTrips.filter(t => t.sort_order >= insertPosition);
    for (const trip of tripsToShift) {
      await supabase
        .from('schedule_trips')
        .update({ sort_order: trip.sort_order + 1 })
        .eq('id', trip.id);
    }

    // Insert the new trip
    await supabase.from('schedule_trips').insert({
      passenger_id: passengerId,
      schedule_section: section,
      scheduled_time: newTime,
      pickup_location: location,
      sort_order: insertPosition,
      is_active: true,
      route,
    });

    // Recalculate times for subsequent trips if requested
    if (adjustExisting && shouldMaintainCorrelation) {
      await recalculateTimesFromPosition(section, route, insertPosition, interval);
    }
  };

  // Continue processing remaining sections after collision dialog resolution
  const continueSchedulesAfterCollision = async (data: CollisionData): Promise<boolean> => {
    if (data.pendingSections.length > 0) {
      return await createSchedulesForPassenger(
        data.passengerId,
        data.location,
        data.registrationNumber,
        data.pendingSections,
        data.route,
        data.customTimes,
        data.shouldMaintainCorrelation
      );
    }

    return false;
  };

  // Handle collision dialog actions
  const handleCollisionConfirmAdjust = async () => {
    if (!collisionData) return;
    setIsSaving(true);
    if (collisionData.isEdit && collisionData.editTripId) {
      // Edit: update existing trip time + sort_order, then recalculate
      const newSortOrder = await calculateSortOrderByTime(collisionData.newTime, collisionData.section, collisionData.route, collisionData.editTripId);
      await supabase.from('schedule_trips').update({
        scheduled_time: collisionData.newTime,
        sort_order: newSortOrder,
        updated_at: new Date().toISOString(),
      }).eq('id', collisionData.editTripId);
      await recalculateSectionSchedule(collisionData.section, collisionData.route);
      // Recalculate times from the collision point
      await recalculateTimesFromPosition(collisionData.section, collisionData.route, newSortOrder, collisionData.interval);
      toast.success(`Horario actualizado a ${collisionData.newTime}. Horarios posteriores ajustados ✓`);
      showOperatorConfirmation({ actionType: 'update', description: `Horario actualizado a ${collisionData.newTime}`, table: 'Horarios/Viajes', route: collisionData.route });
    } else {
      await executeInsertTrip(
        collisionData.passengerId, collisionData.location, collisionData.section,
        collisionData.route, collisionData.newTime, collisionData.insertPosition,
        collisionData.sectionTrips, collisionData.interval,
        collisionData.shouldMaintainCorrelation, true
      );
      toast.success(`Insertado en "${collisionData.section}" a las ${collisionData.newTime}. Horarios posteriores ajustados ✓`);
      showOperatorConfirmation({ actionType: 'insert', description: `Nuevo viaje a las ${collisionData.newTime}`, table: 'Horarios/Viajes', route: collisionData.route });
      const hasPendingCollision = await continueSchedulesAfterCollision(collisionData);
      if (hasPendingCollision) {
        setIsSaving(false);
        return;
      }
    }
    setCollisionDialogOpen(false);
    setCollisionData(null);
    setIsSaving(false);
    setIsPassengerDialogOpen(false);
    loadData();
  };

  const handleCollisionSaveWithout = async () => {
    if (!collisionData) return;
    setIsSaving(true);
    if (collisionData.isEdit && collisionData.editTripId) {
      const newSortOrder = await calculateSortOrderByTime(collisionData.newTime, collisionData.section, collisionData.route, collisionData.editTripId);
      await supabase.from('schedule_trips').update({
        scheduled_time: collisionData.newTime,
        sort_order: newSortOrder,
        updated_at: new Date().toISOString(),
      }).eq('id', collisionData.editTripId);
      await recalculateSectionSchedule(collisionData.section, collisionData.route);
      toast.success(`Horario actualizado a ${collisionData.newTime} sin mover horarios existentes ✓`);
    } else {
      await executeInsertTrip(
        collisionData.passengerId, collisionData.location, collisionData.section,
        collisionData.route, collisionData.newTime, collisionData.insertPosition,
        collisionData.sectionTrips, collisionData.interval,
        collisionData.shouldMaintainCorrelation, false
      );
      toast.success(`Insertado en "${collisionData.section}" a las ${collisionData.newTime} sin mover horarios existentes ✓`);
      const hasPendingCollision = await continueSchedulesAfterCollision(collisionData);
      if (hasPendingCollision) {
        setIsSaving(false);
        return;
      }
    }
    setCollisionDialogOpen(false);
    setCollisionData(null);
    setIsSaving(false);
    setIsPassengerDialogOpen(false);
    loadData();
  };

  const handleCollisionCancel = () => {
    toast.info('Inserción cancelada');
    setCollisionDialogOpen(false);
    setCollisionData(null);
    setIsSaving(false);
  };

  // Create automatic schedules for a new passenger based on their registration number and selected routes
  const createSchedulesForPassenger = async (
    passengerId: string, 
    location: string | null, 
    registrationNumber: number, 
    routes: string[],
    passengerRoute: string,
    customTimes: Record<string, string> = {},
    shouldMaintainCorrelation: boolean = true
  ): Promise<boolean> => {
    if (routes.length === 0) return false;

    // Find passenger name for dialog display
    const passenger = passengers.find(p => p.id === passengerId);
    const passengerName = passenger?.name || 'Nuevo usuario';
    
    for (let idx = 0; idx < routes.length; idx++) {
      const section = routes[idx];

      // Reload trips to get latest data for this section AND route
      const { data: currentTrips } = await supabase
        .from('schedule_trips')
        .select('*, passengers(*)')
        .eq('schedule_section', section)
        .eq('route', passengerRoute)
        .eq('is_active', true)
        .order('sort_order');
      
      const sectionTrips = (currentTrips || []) as ScheduleTrip[];
      const interval = detectInterval(sectionTrips);
      const hasCustomTime = customTimes[section] && customTimes[section].trim() !== '';
      
      // STEP 1: Determine newTime FIRST
      let newTime: string;
      let insertPosition: number;
      
      if (hasCustomTime) {
        newTime = customTimes[section];
        const customMinutes = timeToMinutes(newTime);
        
        // STEP 2: Calculate insertPosition CHRONOLOGICALLY
        insertPosition = sectionTrips.length + 1; // Default: end
        for (let i = 0; i < sectionTrips.length; i++) {
          const tripMinutes = timeToMinutes(sectionTrips[i].scheduled_time);
          if (customMinutes <= tripMinutes) {
            insertPosition = i + 1;
            break;
          }
        }
        
        // STEP 3: Detect collision
        const collidingTrip = sectionTrips.find(t => timeToMinutes(t.scheduled_time) === timeToMinutes(newTime));
        if (collidingTrip) {
          // Build preview and show dialog — remaining sections are queued
          const previewRows = buildCollisionPreview(sectionTrips, insertPosition, newTime, interval, passengerName);
          const pendingSections = routes.slice(idx + 1);
          
          setCollisionData({
            section,
            route: passengerRoute,
            newTime,
            insertPosition,
            interval,
            passengerId,
            location,
            sectionTrips,
            previewRows,
            pendingSections,
            customTimes,
            registrationNumber,
            shouldMaintainCorrelation,
            passengerName,
          });
          setIsSaving(false);
          setCollisionDialogOpen(true);
          return true; // Collision detected — dialog will handle continuation
        }
      } else {
        // No custom time: calculate position by registration number, then derive time
        insertPosition = sectionTrips.length + 1;
        
        for (let i = 0; i < sectionTrips.length; i++) {
          const trip = sectionTrips[i];
          const tripPassengerRegNum = trip.passengers?.registration_number || 0;
          if (registrationNumber < tripPassengerRegNum) {
            insertPosition = i + 1;
            break;
          }
        }
        
        if (insertPosition === 1) {
          newTime = DEFAULT_TIMES[section] || '08:00';
        } else if (insertPosition <= sectionTrips.length) {
          const previousTrip = sectionTrips[insertPosition - 2];
          newTime = previousTrip
            ? minutesToTime(timeToMinutes(previousTrip.scheduled_time) + interval)
            : DEFAULT_TIMES[section] || '08:00';
        } else {
          const lastTrip = sectionTrips[sectionTrips.length - 1];
          newTime = lastTrip
            ? minutesToTime(timeToMinutes(lastTrip.scheduled_time) + interval)
            : DEFAULT_TIMES[section] || '08:00';
        }
      }
      
      // STEP 4: No collision — insert directly
      await executeInsertTrip(
        passengerId, location, section, passengerRoute,
        newTime, insertPosition, sectionTrips, interval,
        shouldMaintainCorrelation, true
      );
    }
    return false;
  };

  // Recalculate times for all trips starting from a specific position
  const recalculateTimesFromPosition = async (section: string, route: string, startPosition: number, interval: number) => {
    const { data: allTrips } = await supabase
      .from('schedule_trips')
      .select('*')
      .eq('schedule_section', section)
      .eq('route', route)
      .eq('is_active', true)
      .order('sort_order');
    
    if (!allTrips || allTrips.length === 0) return;
    
    // Get the trip at startPosition to use as reference
    const referenceTrip = allTrips.find(t => t.sort_order === startPosition);
    if (!referenceTrip) return;
    
    let currentTime = timeToMinutes(referenceTrip.scheduled_time);
    
    // Update all trips after the reference position
    for (const trip of allTrips) {
      if (trip.sort_order > startPosition) {
        currentTime += interval;
        await supabase
          .from('schedule_trips')
          .update({ scheduled_time: minutesToTime(currentTime) })
          .eq('id', trip.id);
      }
    }
  };

  // Call AI to estimate schedule adjustments when location changes
  const estimateScheduleAdjustment = async (
    changedTrip: ScheduleTrip,
    passengerName: string,
    oldLocation: string | null,
    newLocation: string,
    route: string
  ) => {
    const section = changedTrip.schedule_section;
    
    // Get all trips in this section
    const { data: sectionTrips } = await supabase
      .from('schedule_trips')
      .select('*, passengers(name)')
      .eq('schedule_section', section)
      .eq('route', route)
      .eq('is_active', true)
      .order('sort_order');
    
    if (!sectionTrips || sectionTrips.length < 2) return null;
    
    const tripsForAi = sectionTrips.map((t: any) => ({
      id: t.id,
      passenger_name: t.passengers?.name || 'Sin nombre',
      scheduled_time: t.scheduled_time,
      pickup_location: t.id === changedTrip.id ? newLocation : (t.pickup_location || 'Sin dirección'),
      sort_order: t.sort_order,
      schedule_section: t.schedule_section,
    }));
    
    const changedTripForAi = {
      ...tripsForAi.find((t: any) => t.id === changedTrip.id),
      passenger_name: passengerName,
    };
    
    const res = await supabase.functions.invoke('estimate-schedule-adjustment', {
      body: {
        changedTrip: changedTripForAi,
        allSectionTrips: tripsForAi,
        routeName: route,
        oldLocation: oldLocation || 'No definida',
        newLocation,
      },
    });
    
    if (res.error) throw new Error(res.error.message || 'Error al estimar ajustes');
    if (res.data?.error) throw new Error(res.data.error);
    
    return res.data;
  };

  // Apply confirmed AI adjustments
  const applyAiAdjustments = async () => {
    if (!pendingAiSaveData) return;
    
    setIsSaving(true);
    
    try {
      const { editingPassenger: ep, passengerData, regNum, enforcedRoutes, currentTrips, routesToAdd, routesToRemove } = pendingAiSaveData;
      
      // 1. Save passenger data
      await supabase.from('passengers').update(passengerData).eq('id', ep.id);
      
      // 2. Remove deselected routes
      for (const section of routesToRemove) {
        const tripToRemove = currentTrips.find(t => t.schedule_section === section);
        if (tripToRemove) await supabase.from('schedule_trips').delete().eq('id', tripToRemove.id);
      }
      
      // 3. Add new routes
      if (routesToAdd.length > 0) {
        const hasCollision = await createSchedulesForPassenger(ep.id, passengerForm.location || null, regNum, routesToAdd, ep.route);
        if (hasCollision) return;
      }
      
      // 4. Update location for existing trips
      const updatedTrips = currentTrips.filter(t => enforcedRoutes.includes(t.schedule_section));
      for (const trip of updatedTrips) {
        await supabase.from('schedule_trips').update({ pickup_location: passengerForm.location || null, updated_at: new Date().toISOString() }).eq('id', trip.id);
      }
      
      // 5. Apply AI-suggested time adjustments
      for (const adj of aiAdjustments) {
        if (adj.old_time !== adj.new_time) {
          await supabase
            .from('schedule_trips')
            .update({ scheduled_time: adj.new_time, updated_at: new Date().toISOString() })
            .eq('id', adj.trip_id);
        }
      }
      
      // 6. Recalculate section ordering
      const affectedSections = [...new Set(updatedTrips.map(t => t.schedule_section))];
      for (const section of affectedSections) {
        await recalculateSectionSchedule(section, ep.route);
      }
      
      toast.success('✅ Horarios ajustados con IA y aplicados correctamente', { duration: 5000 });
    } catch (err: any) {
      toast.error('Error al aplicar ajustes: ' + (err?.message || 'Error desconocido'));
    } finally {
      setIsSaving(false);
      setIsAiAdjustDialogOpen(false);
      setIsPassengerDialogOpen(false);
      setPendingAiSaveData(null);
      setAiAdjustments([]);
      setAiUnchanged([]);
      setAiAnalysis('');
      loadData();
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Registration numbers are independent per route and only count ACTIVE users.
  // We also try to keep numbers contiguous by filling the first missing number.
  const getMaxRegNumberForRoute = (route: string, passengersList: Passenger[]) => {
    const routePassengers = passengersList.filter(p => p.route === route && p.is_active);
    return Math.max(0, ...routePassengers.map(p => p.registration_number || 0));
  };

  const getNextRegistrationNumberForRoute = (route: string, passengersList: Passenger[]) => {
    const used = new Set(
      passengersList
        .filter(p => p.route === route && p.is_active)
        .map(p => p.registration_number)
        .filter((n): n is number => typeof n === 'number' && n > 0)
    );

    let next = 1;
    while (used.has(next)) next += 1;
    return next;
  };

  const loadData = async () => {
    const [passengersRes, tripsRes, notesRes] = await Promise.all([
      supabase.from('passengers').select('*').order('registration_number'),
      supabase.from('schedule_trips').select('*, passengers(*)').order('sort_order'),
      supabase.from('passenger_notes').select('*').eq('is_active', true),
    ]);

    if (passengersRes.data) {
      setPassengers(passengersRes.data);
      // Update maxRegistrationNumber based on selected route
      const maxNum = getMaxRegNumberForRoute(selectedRouteFilter, passengersRes.data);
      setMaxRegistrationNumber(maxNum);
    }
    if (tripsRes.data) setTrips(tripsRes.data as ScheduleTrip[]);
    if (notesRes.data) setPassengerNotes(notesRes.data as PassengerNote[]);
  };

  // Passenger CRUD
  const openPassengerDialog = (passenger?: Passenger) => {
    if (passenger) {
      setEditingPassenger(passenger);
      setPassengerForm({
        name: passenger.name,
        location: passenger.location || '',
        contact_name: passenger.contact_name || '',
        contact_phone: passenger.contact_phone || '',
        trip_type: (passenger.trip_type as '' | 'S' | 'B') || '',
        registration_number: passenger.registration_number,
      });
      // Load current routes and times for existing passenger
      const passengerTrips = trips.filter(t => t.passenger_id === passenger.id && t.is_active);
      const currentRoutes = passengerTrips.map(t => t.schedule_section);
      setSelectedRoutes(currentRoutes);
      // Pre-fill custom times with current trip times
      const currentTimes: Record<string, string> = {};
      passengerTrips.forEach(t => {
        currentTimes[t.schedule_section] = t.scheduled_time;
      });
      setRouteCustomTimes(currentTimes);
      setMaintainCorrelation(true);
    } else {
      setEditingPassenger(null);
      // Next registration number for the current route (only ACTIVE users, fills gaps)
      const nextRegNum = getNextRegistrationNumberForRoute(selectedRouteFilter, passengers);
      setPassengerForm({ 
        name: '', 
        location: '', 
        contact_name: '', 
        contact_phone: '', 
        trip_type: '',
        registration_number: nextRegNum,
      });
      // Default routes based on selected route filter
      const defaultRoutes = (selectedRouteFilter === 'ASPACE' || selectedRouteFilter === 'AMARAEN FINDE')
        ? ['morning_first', 'afternoon_first']
        : ['morning_first', 'morning_second', 'afternoon_first', 'afternoon_second'];
      setSelectedRoutes(defaultRoutes);
      // Reset custom times and correlation setting
      setRouteCustomTimes({});
      setMaintainCorrelation(true);
    }
    setIsPassengerDialogOpen(true);
  };

  const reorderPassengers = async (newNumber: number, route: string, excludeId?: string) => {
    // Shift all passengers with registration_number >= newNumber up by 1 (only for the same route)
    const toUpdate = passengers.filter(
      p => p.id !== excludeId && p.route === route && p.registration_number && p.registration_number >= newNumber
    );
    
    for (const p of toUpdate) {
      await supabase
        .from('passengers')
        .update({ registration_number: (p.registration_number || 0) + 1 })
        .eq('id', p.id);
    }
  };

  // Update passenger's trips when their registration number changes
  const updatePassengerTripsPosition = async (passengerId: string, newPosition: number, oldPosition: number, route: string) => {
    // Dynamically discover sections from the passenger's actual trips in this route
    const { data: passengerTripsData } = await supabase
      .from('schedule_trips')
      .select('schedule_section')
      .eq('passenger_id', passengerId)
      .eq('route', route)
      .eq('is_active', true);

    const sections = [...new Set((passengerTripsData || []).map(t => t.schedule_section))];
    if (sections.length === 0) return;

    // Get all active trips for this route to work with
    const { data: currentTrips } = await supabase
      .from('schedule_trips')
      .select('*, passengers(*)')
      .eq('route', route)
      .eq('is_active', true)
      .order('sort_order');
    
    const tripsData = (currentTrips || []) as ScheduleTrip[];
    
    for (const section of sections) {
      const sectionTrips = tripsData.filter(t => t.schedule_section === section);
      const sortedTrips = [...sectionTrips].sort((a, b) => a.sort_order - b.sort_order);
      
      // Find the trip for this passenger in this section
      const passengerTrip = sortedTrips.find(t => t.passenger_id === passengerId);
      if (!passengerTrip) continue;
      
      const interval = detectInterval(sectionTrips);
      
      if (newPosition < oldPosition) {
        // Moving up: shift others down
        for (const trip of sortedTrips.filter(t => t.sort_order >= newPosition && t.sort_order < oldPosition && t.id !== passengerTrip.id)) {
          await supabase
            .from('schedule_trips')
            .update({ sort_order: trip.sort_order + 1 })
            .eq('id', trip.id);
        }
      } else {
        // Moving down: shift others up
        for (const trip of sortedTrips.filter(t => t.sort_order > oldPosition && t.sort_order <= newPosition && t.id !== passengerTrip.id)) {
          await supabase
            .from('schedule_trips')
            .update({ sort_order: trip.sort_order - 1 })
            .eq('id', trip.id);
        }
      }
      
      // Update this passenger's trip sort_order
      await supabase
        .from('schedule_trips')
        .update({ sort_order: newPosition })
        .eq('id', passengerTrip.id);
      
      // Recalculate times for all trips in this section (filtered by route)
      const { data: updatedTrips } = await supabase
        .from('schedule_trips')
        .select('*')
        .eq('schedule_section', section)
        .eq('route', route)
        .eq('is_active', true)
        .order('sort_order');
      
      if (updatedTrips && updatedTrips.length > 0) {
        let currentTime = timeToMinutes(DEFAULT_TIMES[section] || '8:00');
        
        for (const trip of updatedTrips) {
          await supabase
            .from('schedule_trips')
            .update({ scheduled_time: minutesToTime(currentTime) })
            .eq('id', trip.id);
          currentTime += interval;
        }
      }
    }
  };

  const savePassenger = async () => {
    if (isSaving) return;
    
    if (!passengerForm.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    // Validate routes
    if (selectedRoutes.length === 0) {
      toast.error('Selecciona al menos una ruta');
      return;
    }

    setIsSaving(true);

    // Get the correct max registration number for the current route
    const routeForCalc = editingPassenger ? editingPassenger.route : selectedRouteFilter;
    const routeMaxNum = getMaxRegNumberForRoute(routeForCalc, passengers);
    const regNum = passengerForm.registration_number || routeMaxNum + 1;

    // Clean passenger data - only include valid fields with proper types
    // For new passengers, use the selected route filter; for existing, keep their current route
    const passengerRoute = editingPassenger ? editingPassenger.route : selectedRouteFilter;
    
    const passengerData = {
      name: passengerForm.name.trim(),
      location: passengerForm.location?.trim() || null,
      contact_name: passengerForm.contact_name?.trim() || null,
      contact_phone: passengerForm.contact_phone?.trim() || null,
      trip_type: passengerForm.trip_type || null,
      registration_number: regNum,
      route: passengerRoute,
    };

    if (editingPassenger) {
      const oldRegNum = editingPassenger.registration_number || 0;
      const positionChanged = oldRegNum !== regNum;
      
      // Detect location change
      const oldLocation = editingPassenger.location?.trim() || '';
      const newLocation = passengerForm.location?.trim() || '';
      const locationChanged = oldLocation !== newLocation && newLocation !== '';
      
      // If location changed, trigger AI estimation for affected sections
      if (locationChanged) {
        const currentTrips = trips.filter(t => t.passenger_id === editingPassenger.id && t.is_active);
        const enforcedRoutes = enforceRequiredSections(editingPassenger.route, selectedRoutes);
        const currentRoutes = currentTrips.map(t => t.schedule_section);
        const routesToAdd = enforcedRoutes.filter(r => !currentRoutes.includes(r));
        const routesToRemove = currentRoutes.filter(r => !enforcedRoutes.includes(r));
        
        setIsAiEstimating(true);
        toast.info('🤖 Analizando impacto del cambio de dirección con IA...', { duration: 3000 });
        
        try {
          // Estimate for each section the passenger is in
          const allAdjustments: ScheduleAdjustment[] = [];
          const allUnchanged: ScheduleUnchanged[] = [];
          let combinedAnalysis = '';
          
          for (const trip of currentTrips) {
            if (!enforcedRoutes.includes(trip.schedule_section)) continue;
            
            const result = await estimateScheduleAdjustment(
              trip, editingPassenger.name, oldLocation || null, newLocation, editingPassenger.route
            );
            
            if (result && result.adjustments) {
              allAdjustments.push(...result.adjustments);
              if (result.unchanged) allUnchanged.push(...result.unchanged);
              if (result.analysis) combinedAnalysis += (combinedAnalysis ? '\n\n' : '') + `📍 ${trip.schedule_section}: ${result.analysis}`;
            }
          }
          
          // Only show dialog if there are actual time changes
          const hasChanges = allAdjustments.some(a => a.old_time !== a.new_time);
          
          if (hasChanges) {
            setAiAdjustments(allAdjustments);
            setAiUnchanged(allUnchanged);
            setAiAnalysis(combinedAnalysis);
            setPendingAiSaveData({
              editingPassenger,
              passengerData,
              regNum,
              enforcedRoutes,
              currentTrips,
              routesToAdd,
              routesToRemove,
            });
            setIsAiEstimating(false);
            setIsSaving(false);
            setIsAiAdjustDialogOpen(true);
            return; // Stop here - user must confirm
          }
          
          // No time changes needed, proceed normally
          setIsAiEstimating(false);
          toast.info('La IA no detecta necesidad de cambio en los horarios', { duration: 3000 });
        } catch (err: any) {
          console.error('AI estimation error:', err);
          setIsAiEstimating(false);
          toast.warning('⚠️ No se pudo estimar con IA. Se guardarán los datos sin ajustar horarios.', { duration: 4000 });
        }
      }
      
      // If registration number changed, reorder passengers and trips (within the same route)
      if (positionChanged) {
        await reorderPassengers(regNum, editingPassenger.route, editingPassenger.id);
      }
      
      const { error } = await supabase
        .from('passengers')
        .update(passengerData)
        .eq('id', editingPassenger.id);
      
      if (error) {
        console.error('Error updating passenger:', error);
        toast.error('Error al actualizar: ' + error.message);
        return;
      }
      
      // Update trip positions if registration number changed
      if (positionChanged) {
        await updatePassengerTripsPosition(editingPassenger.id, regNum, oldRegNum, editingPassenger.route);
      }
      
      // Handle route changes for existing passenger
      const currentTrips = trips.filter(t => t.passenger_id === editingPassenger.id && t.is_active);
      const currentRoutes = currentTrips.map(t => t.schedule_section);

      // En ASPACE/AMARAEN FINDE forzamos siempre mañana+tarde
      const enforcedRoutes = enforceRequiredSections(editingPassenger.route, selectedRoutes);

      // Routes to add (selected but not currently assigned)
      const routesToAdd = enforcedRoutes.filter(r => !currentRoutes.includes(r));

      // Routes to remove (currently assigned but not selected)
      const routesToRemove = currentRoutes.filter(r => !enforcedRoutes.includes(r));

      // Remove trips for deselected routes
      for (const section of routesToRemove) {
        const tripToRemove = currentTrips.find(t => t.schedule_section === section);
        if (tripToRemove) {
          await supabase.from('schedule_trips').delete().eq('id', tripToRemove.id);
        }
      }

      // Add trips for newly selected routes
      if (routesToAdd.length > 0) {
        const hasCollision = await createSchedulesForPassenger(
          editingPassenger.id,
          passengerForm.location || null,
          regNum,
          routesToAdd,
          editingPassenger.route,
          routeCustomTimes,
          maintainCorrelation
        );
        if (hasCollision) return;
      }

      // Update location and time for existing trips (with preview modal for schedule changes)
      const updatedTrips = currentTrips.filter(t => enforcedRoutes.includes(t.schedule_section));
      for (const trip of updatedTrips) {
        const newTime = routeCustomTimes[trip.schedule_section];
        const timeChanged = newTime && newTime !== trip.scheduled_time;
        const locationChangedInTrip = (passengerForm.location || '') !== (trip.pickup_location || '');
        
        // If schedule fields changed, show preview modal
        if (timeChanged || locationChangedInTrip) {
          const changes: { tripId: string; field: 'scheduled_time' | 'pickup_location'; oldValue: string; newValue: string }[] = [];
          if (timeChanged) {
            changes.push({ tripId: trip.id, field: 'scheduled_time', oldValue: trip.scheduled_time, newValue: newTime });
          }
          if (locationChangedInTrip) {
            changes.push({ tripId: trip.id, field: 'pickup_location', oldValue: trip.pickup_location || '', newValue: passengerForm.location || '' });
          }
          
          const allSections = getRouteSections(editingPassenger.route);
          const sectionObj = allSections.find(s => s.value === trip.schedule_section);
          
          setPreviewModalSection(trip.schedule_section);
          setPreviewModalSectionLabel(sectionObj?.label || trip.schedule_section);
          setPreviewModalRoute(editingPassenger.route);
          setPreviewModalTripId(trip.id);
          setPreviewModalChanges(changes);
          setIsPassengerDialogOpen(false);
          setIsPreviewModalOpen(true);
          setIsSaving(false);
          return;
        }
        
        const updateData: Record<string, any> = { pickup_location: passengerForm.location || null, updated_at: new Date().toISOString() };
        
        await supabase
          .from('schedule_trips')
          .update(updateData)
          .eq('id', trip.id);
        
        // Reorder the section
        await recalculateSectionSchedule(trip.schedule_section, editingPassenger.route);
      }
      
      toast.success('Usuario y horarios actualizados ✓ Orden reajustado automáticamente', { duration: 4000 });
      showOperatorConfirmation({ actionType: 'update', description: `Actualizado: ${passengerForm.name}`, table: 'Pasajeros', route: selectedRouteFilter });
    } else {
      // For new passenger, reorder if inserting in the middle (within the selected route)
      await reorderPassengers(regNum, selectedRouteFilter);
      
      const { data, error } = await supabase
        .from('passengers')
        .insert({ ...passengerData, is_active: true })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating passenger:', error);
        toast.error('Error al crear: ' + error.message);
      } else if (data) {
        // En ASPACE/AMARAEN FINDE forzamos siempre mañana+tarde
        const enforcedRoutes = enforceRequiredSections(selectedRouteFilter, selectedRoutes);

        // Create automatic schedules for the new passenger based on their registration number and selected routes
        const hasCollision = await createSchedulesForPassenger(
          data.id,
          passengerForm.location?.trim() || null,
          regNum,
          enforcedRoutes,
          selectedRouteFilter,
          routeCustomTimes,
          maintainCorrelation
        );
        if (hasCollision) {
          // Dialog is open — don't close anything yet
          return;
        }
        const routeCount = enforcedRoutes.length;
        toast.success(`Usuario creado con ${routeCount} ruta${routeCount !== 1 ? 's' : ''}`);
        showOperatorConfirmation({ actionType: 'insert', description: `Nuevo pasajero: ${passengerForm.name}`, table: 'Pasajeros', route: selectedRouteFilter });
      }
    }

    setIsSaving(false);
    setIsPassengerDialogOpen(false);
    loadData();
  };

  // Deactivate passenger (dar de baja) - also deactivates all their trips
  const deactivatePassenger = async (id: string) => {
    const pName = passengers.find(p => p.id === id)?.name || 'Desconocido';
    if (!confirm('¿Seguro que quieres dar de baja este usuario? Se desactivarán también todos sus viajes.')) return;
    
    // First, deactivate all schedule_trips associated with this passenger
    const { error: tripsError } = await supabase
      .from('schedule_trips')
      .update({ is_active: false })
      .eq('passenger_id', id);
    
    if (tripsError) {
      console.error('Error deactivating trips:', tripsError);
      toast.error('Error al desactivar viajes: ' + tripsError.message);
      return;
    }
    
    // Then deactivate the passenger
    const { error } = await supabase
      .from('passengers')
      .update({ is_active: false })
      .eq('id', id);
      
    if (error) {
      console.error('Error deactivating passenger:', error);
      toast.error('Error al dar de baja: ' + error.message);
    } else {
      toast.success('Usuario dado de baja correctamente');
      showOperatorConfirmation({ actionType: 'delete', description: `Baja: ${pName}`, table: 'Pasajeros', route: selectedRouteFilter, passenger_name: pName });
      loadData();
    }
  };

  // Reactivate passenger (dar de alta) - also reactivates all their trips
  const reactivatePassenger = async (id: string) => {
    const pNameReact = passengers.find(p => p.id === id)?.name || 'Desconocido';
    if (!confirm('¿Seguro que quieres dar de alta este usuario? Se reactivarán también todos sus viajes.')) return;
    
    // First, reactivate all schedule_trips associated with this passenger
    const { error: tripsError } = await supabase
      .from('schedule_trips')
      .update({ is_active: true })
      .eq('passenger_id', id);
    
    if (tripsError) {
      console.error('Error reactivating trips:', tripsError);
      toast.error('Error al reactivar viajes: ' + tripsError.message);
      return;
    }
    
    // Then reactivate the passenger
    const { error } = await supabase
      .from('passengers')
      .update({ is_active: true })
      .eq('id', id);
      
    if (error) {
      console.error('Error reactivating passenger:', error);
      toast.error('Error al dar de alta: ' + error.message);
    } else {
      toast.success('Usuario dado de alta correctamente');
      showOperatorConfirmation({ actionType: 'insert', description: `Alta: ${pNameReact}`, table: 'Pasajeros', route: selectedRouteFilter, passenger_name: pNameReact });
      loadData();
    }
  };

  // Permanently delete passenger (eliminar definitivamente)
  const deletePassenger = async (id: string) => {
    const passengerToDelete = passengers.find(p => p.id === id);
    const passengerName = passengerToDelete?.name || 'Desconocido';
    if (!confirm(`¿ELIMINAR DEFINITIVAMENTE a ${passengerName} y todos sus viajes? Esta acción no se puede deshacer.`)) return;
    
    // First, delete all schedule_trips associated with this passenger
    const { error: tripsError } = await supabase
      .from('schedule_trips')
      .delete()
      .eq('passenger_id', id);
    
    if (tripsError) {
      console.error('Error deleting trips:', tripsError);
      toast.error('Error al eliminar viajes: ' + tripsError.message);
      return;
    }
    
    // Then delete the passenger
    const { error } = await supabase.from('passengers').delete().eq('id', id);
    if (error) {
      console.error('Error deleting passenger:', error);
      toast.error('Error al eliminar usuario: ' + error.message);
    } else {
      toast.success('Usuario eliminado definitivamente');
      showOperatorConfirmation({ actionType: 'delete', description: `Eliminado: ${passengerName}`, table: 'Pasajeros', route: selectedRouteFilter, passenger_name: passengerName });
      loadData();
    }
  };

  // Calculate date filter based on period
  const getDateFilterFromPeriod = (period: string): string | null => {
    const now = new Date();
    let filterDate: Date | null = null;
    
    switch (period) {
      case '30d':
        filterDate = new Date(now);
        filterDate.setDate(filterDate.getDate() - 30);
        break;
      case '3m':
        filterDate = new Date(now);
        filterDate.setMonth(filterDate.getMonth() - 3);
        break;
      case '6m':
        filterDate = new Date(now);
        filterDate.setMonth(filterDate.getMonth() - 6);
        break;
      case '12m':
        filterDate = new Date(now);
        filterDate.setFullYear(filterDate.getFullYear() - 1);
        break;
      case 'all':
      default:
        return null;
    }
    
    return filterDate ? filterDate.toISOString().split('T')[0] : null;
  };

  // Load absence history for a passenger
  const loadAbsenceHistory = async (passenger: Passenger, period: string = 'all') => {
    setViewingAbsencePassenger(passenger);
    setHistoryMode('absences');
    setIsAbsenceHistoryOpen(true);
    setIsLoadingAbsences(true);
    setAbsenceHistory([]);
    setLateHistory([]);

    try {
      const dateFilter = getDateFilterFromPeriod(period);
      
      let query = supabase
        .from('attendance_records')
        .select('id, record_date, route, scheduled_time, trip_id')
        .eq('user_name', passenger.name)
        .eq('status', 'absent')
        .order('record_date', { ascending: false })
        .limit(500);
      
      if (dateFilter) {
        query = query.gte('record_date', dateFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading absence history:', error);
        toast.error('Error al cargar historial');
      } else {
        setAbsenceHistory(data || []);
      }
    } catch (error) {
      console.error('Error loading absence history:', error);
    } finally {
      setIsLoadingAbsences(false);
    }
  };

  // Load late history for a passenger
  const loadLateHistory = async (passenger: Passenger, period: string = 'all') => {
    setViewingAbsencePassenger(passenger);
    setHistoryMode('lates');
    setIsAbsenceHistoryOpen(true);
    setIsLoadingAbsences(true);
    setAbsenceHistory([]);
    setLateHistory([]);

    try {
      const dateFilter = getDateFilterFromPeriod(period);
      
      let query = supabase
        .from('attendance_records')
        .select('id, record_date, route, scheduled_time, actual_time')
        .eq('user_name', passenger.name)
        .eq('status', 'present')
        .like('actual_time', '%T+%')
        .order('record_date', { ascending: false })
        .limit(500);
      
      if (dateFilter) {
        query = query.gte('record_date', dateFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading late history:', error);
        toast.error('Error al cargar historial');
      } else {
        setLateHistory(data || []);
      }
    } catch (error) {
      console.error('Error loading late history:', error);
    } finally {
      setIsLoadingAbsences(false);
    }
  };

  // Handle period filter change
  const handleAbsencePeriodChange = (period: string) => {
    setAbsencePeriodFilter(period);
    if (viewingAbsencePassenger) {
      if (historyMode === 'absences') {
        loadAbsenceHistory(viewingAbsencePassenger, period);
      } else {
        loadLateHistory(viewingAbsencePassenger, period);
      }
    }
  };

  // Trip CRUD
  const openTripDialog = (trip?: ScheduleTrip) => {
    if (trip) {
      setEditingTrip(trip);
      setTripForm({
        passenger_id: trip.passenger_id || '',
        schedule_section: trip.schedule_section,
        scheduled_time: trip.scheduled_time,
        pickup_location: trip.pickup_location || '',
      });
      setIsNewLocation(false);
    } else {
      setEditingTrip(null);
      setTripForm({ passenger_id: '', schedule_section: 'morning_first', scheduled_time: '', pickup_location: '' });
      setIsNewLocation(false);
    }
    setIsTripDialogOpen(true);
  };

  // Check if a pickup location already exists in the section
  const checkLocationExists = (location: string, section: string, route: string): boolean => {
    if (!location.trim()) return false;
    const normalizedLocation = location.trim().toLowerCase();
    return trips.some(
      t => t.is_active &&
           t.schedule_section === section &&
           t.route === route &&
           t.pickup_location?.trim().toLowerCase() === normalizedLocation
    );
  };

  // Get all unique pickup locations for a section and route
  const getExistingLocations = (section: string, route: string): string[] => {
    const locations = trips
      .filter(t => t.is_active && t.schedule_section === section && t.route === route && t.pickup_location)
      .map(t => t.pickup_location!)
      .filter((v, i, a) => a.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i);
    return locations;
  };

  // Handle location input change with autocomplete
  const handleLocationChange = (value: string) => {
    setTripForm({ ...tripForm, pickup_location: value });
    
    const existingLocations = getExistingLocations(tripForm.schedule_section, selectedRouteFilter);
    const filtered = existingLocations.filter(loc => 
      loc.toLowerCase().includes(value.toLowerCase())
    );
    setLocationSuggestions(filtered);
    setShowLocationSuggestions(value.length > 0 && filtered.length > 0);
    
    // Check if this is a new location
    const locationExists = checkLocationExists(value, tripForm.schedule_section, selectedRouteFilter);
    setIsNewLocation(value.trim().length > 0 && !locationExists);
  };

  // Select a location from suggestions
  const selectLocationSuggestion = (location: string) => {
    setTripForm({ ...tripForm, pickup_location: location });
    setShowLocationSuggestions(false);
    setIsNewLocation(false);
  };

  const saveTrip = async () => {
    if (!tripForm.scheduled_time.trim()) {
      toast.error('La hora es obligatoria');
      return;
    }

    const route = selectedRouteFilter;
    const section = tripForm.schedule_section;
    const pickupLocation = tripForm.pickup_location?.trim() || null;
    const scheduledTime = tripForm.scheduled_time;
    const tripPassengerForLog = passengers.find(p => p.id === tripForm.passenger_id)?.name || 'Sin asignar';
    
    // Check if this location already exists in this section/route
    const locationExists = pickupLocation ? checkLocationExists(pickupLocation, section, route) : false;

    if (editingTrip) {
      // EDITING EXISTING TRIP — save directly, reposition by time, do NOT cascade other trips
      const newSortOrder = await calculateSortOrderByTime(scheduledTime, section, route, editingTrip.id);
      const updateData = {
        passenger_id: tripForm.passenger_id || null,
        schedule_section: section,
        scheduled_time: scheduledTime,
        pickup_location: pickupLocation,
        sort_order: newSortOrder,
      };
      
      const { error } = await supabase
        .from('schedule_trips')
        .update(updateData)
        .eq('id', editingTrip.id);
      
      if (error) {
        console.error('Error updating trip:', error);
        toast.error('Error al actualizar: ' + error.message);
      } else {
        await recalculateSectionSchedule(section, route);
        toast.success('Horario actualizado');
        showOperatorConfirmation({ actionType: 'update', description: `Horario actualizado a ${scheduledTime}`, table: 'Horarios/Viajes', route, passenger_name: tripPassengerForLog });
      }
    } else {
      // CREATING NEW TRIP
      // Calculate sort_order based on scheduled time
      const newSortOrder = await calculateSortOrderByTime(scheduledTime, section, route);
      
      const insertData = {
        passenger_id: tripForm.passenger_id || null,
        schedule_section: section,
        scheduled_time: scheduledTime,
        pickup_location: pickupLocation,
        sort_order: newSortOrder,
        is_active: true,
        route: route,
      };

      const { data: insertedTrip, error } = await supabase
        .from('schedule_trips')
        .insert(insertData)
        .select()
        .single();
        
      if (error) {
        console.error('Error creating trip:', error);
        toast.error('Error al crear: ' + error.message);
      } else {
        // If it's a NEW location (not existing), reorganize subsequent schedules
        if (!locationExists && pickupLocation) {
          await reorganizeSchedulesFromTime(section, route, scheduledTime, insertedTrip?.id);
          toast.success('Horario creado ✓ Orden actualizado automáticamente', { duration: 4000 });
          showOperatorConfirmation({ actionType: 'insert', description: `Nuevo viaje a las ${scheduledTime}`, table: 'Horarios/Viajes', route, passenger_name: tripPassengerForLog });
        } else {
          // If location exists, just update sort orders without changing times
          await recalculateSectionSchedule(section, route);
          toast.success('Horario creado en parada existente ✓ Orden actualizado', { duration: 4000 });
          showOperatorConfirmation({ actionType: 'insert', description: `Nuevo viaje a las ${scheduledTime} en parada existente`, table: 'Horarios/Viajes', route, passenger_name: tripPassengerForLog });
        }
      }
    }

    setIsTripDialogOpen(false);
    setIsNewLocation(false);
    loadData();
  };

  // Calculate the correct sort_order based on scheduled time
  const calculateSortOrderByTime = async (time: string, section: string, route: string, excludeId?: string): Promise<number> => {
    const { data: sectionTrips } = await supabase
      .from('schedule_trips')
      .select('*')
      .eq('schedule_section', section)
      .eq('route', route)
      .eq('is_active', true)
      .order('scheduled_time');
    
    if (!sectionTrips || sectionTrips.length === 0) return 1;
    
    const filteredTrips = excludeId 
      ? sectionTrips.filter(t => t.id !== excludeId)
      : sectionTrips;
    
    const newTimeMinutes = timeToMinutes(time);
    
    // Find the position where this time should be inserted
    let position = 1;
    for (const trip of filteredTrips) {
      const tripTimeMinutes = timeToMinutes(trip.scheduled_time);
      if (newTimeMinutes > tripTimeMinutes) {
        position++;
      } else {
        break;
      }
    }
    
    return position;
  };

  // Reorganize schedules from a specific time onwards (for new locations) - location-aware
  const reorganizeSchedulesFromTime = async (section: string, route: string, fromTime: string, insertedTripId?: string) => {
    const { data: allTrips } = await supabase
      .from('schedule_trips')
      .select('*')
      .eq('schedule_section', section)
      .eq('route', route)
      .eq('is_active', true)
      .order('scheduled_time');
    
    if (!allTrips || allTrips.length === 0) return;
    
    const interval = detectInterval(allTrips as ScheduleTrip[]);
    const fromTimeMinutes = timeToMinutes(fromTime);
    
    const sortedTrips = [...allTrips].sort((a, b) => 
      timeToMinutes(a.scheduled_time) - timeToMinutes(b.scheduled_time)
    );
    
    const insertedIndex = sortedTrips.findIndex(t => t.id === insertedTripId);
    if (insertedIndex === -1) return;
    
    let currentTime = fromTimeMinutes;
    let prevLocation = sortedTrips[insertedIndex].pickup_location?.trim().toLowerCase() || '';
    
    for (let i = insertedIndex + 1; i < sortedTrips.length; i++) {
      const trip = sortedTrips[i];
      const tripLocation = trip.pickup_location?.trim().toLowerCase() || '';
      
      if (tripLocation !== prevLocation || !tripLocation) {
        currentTime += interval;
      }
      
      await supabase
        .from('schedule_trips')
        .update({ scheduled_time: minutesToTime(currentTime), updated_at: new Date().toISOString() })
        .eq('id', trip.id);
      
      prevLocation = tripLocation;
    }
    
    await recalculateSectionSchedule(section, route);
  };

  const deleteTrip = async (id: string) => {
    // Find the trip to get the passenger_id
    const tripToDelete = trips.find(t => t.id === id);
    if (!tripToDelete) {
      toast.error('Viaje no encontrado');
      return;
    }

    // Get passenger name for logging
    const tripPassenger = passengers.find(p => p.id === tripToDelete.passenger_id);
    const tripPassengerName = tripPassenger?.name || 'Sin asignar';

    if (!confirm(`¿Seguro que quieres eliminar el horario de ${tripPassengerName}? También se eliminará el usuario de la ruta.`)) return;
    
    const passengerId = tripToDelete.passenger_id;
    
    // Delete the trip first
    const { error: tripError } = await supabase.from('schedule_trips').delete().eq('id', id);
    if (tripError) {
      toast.error('Error al eliminar horario');
      return;
    }
    
    // If there was a passenger, check if they have other trips
    if (passengerId) {
      const { data: remainingTrips } = await supabase
        .from('schedule_trips')
        .select('id')
        .eq('passenger_id', passengerId)
        .eq('is_active', true);
      
      // If no more trips, delete the passenger too
      if (!remainingTrips || remainingTrips.length === 0) {
        const { error: passengerError } = await supabase
          .from('passengers')
          .delete()
          .eq('id', passengerId);
        
        if (passengerError) {
          console.error('Error deleting passenger:', passengerError);
          toast.success('Horario eliminado (usuario conservado por error)');
        } else {
          toast.success('Horario y usuario eliminados');
        }
      } else {
        toast.success('Horario eliminado (usuario tiene otros viajes)');
      }
    } else {
      toast.success('Horario eliminado');
    }
    showOperatorConfirmation({ actionType: 'delete', description: `Horario eliminado: ${tripPassengerName}`, table: 'Horarios/Viajes', route: selectedRouteFilter, passenger_name: tripPassengerName });
    
    loadData();
  };

  // Open dialog to insert a user into a route section
  const openInsertToRouteDialog = (section: string) => {
    setInsertRouteSection(section);
    setIsInsertToRouteDialogOpen(true);
  };

  // Insert a user into a route at a specific position based on their registration number
  const insertUserToRoute = async (passengerId: string, sectionOverride?: string) => {
    const targetSection = sectionOverride || insertRouteSection;
    const passenger = passengers.find(p => p.id === passengerId);
    if (!passenger) {
      toast.error('Usuario no encontrado');
      return;
    }

    const registrationNumber = passenger.registration_number || 1;
    
    // Get current section trips with passenger info (filtered by route)
    const { data: currentTrips } = await supabase
      .from('schedule_trips')
      .select('*, passengers(*)')
      .eq('schedule_section', targetSection)
      .eq('route', passenger.route)
      .eq('is_active', true)
      .order('sort_order');
    
    const sectionTrips = (currentTrips || []) as ScheduleTrip[];
    const interval = detectInterval(sectionTrips);

    // Find the correct position based on registration number comparison
    let insertPosition = sectionTrips.length + 1; // Default: add at the end
    
    for (let i = 0; i < sectionTrips.length; i++) {
      const trip = sectionTrips[i];
      const tripPassengerRegNum = trip.passengers?.registration_number || 0;
      
      if (registrationNumber < tripPassengerRegNum) {
        insertPosition = i + 1;
        break;
      }
    }

    // Shift existing trips with sort_order >= insertPosition
    const tripsToShift = sectionTrips.filter(t => t.sort_order >= insertPosition);
    for (const trip of tripsToShift) {
      await supabase
        .from('schedule_trips')
        .update({ sort_order: trip.sort_order + 1 })
        .eq('id', trip.id);
    }

    // Calculate the correct time based on position
    let calculatedTime: string;
    if (insertPosition === 1) {
      // First position - use default start time
      calculatedTime = DEFAULT_TIMES[targetSection] || '8:00';
    } else if (insertPosition <= sectionTrips.length) {
      // Inserting in the middle - use time of previous trip + interval
      const previousTrip = sectionTrips[insertPosition - 2];
      if (previousTrip) {
        calculatedTime = minutesToTime(timeToMinutes(previousTrip.scheduled_time) + interval);
      } else {
        calculatedTime = DEFAULT_TIMES[targetSection] || '8:00';
      }
    } else {
      // Adding at the end
      const lastTrip = sectionTrips[sectionTrips.length - 1];
      if (lastTrip) {
        calculatedTime = minutesToTime(timeToMinutes(lastTrip.scheduled_time) + interval);
      } else {
        calculatedTime = DEFAULT_TIMES[targetSection] || '8:00';
      }
    }

    // Insert the new trip with the correct route and calculated time
    const { error } = await supabase.from('schedule_trips').insert({
      passenger_id: passengerId,
      schedule_section: targetSection,
      scheduled_time: calculatedTime,
      pickup_location: passenger.location,
      sort_order: insertPosition,
      is_active: true,
      route: passenger.route,
    });

    if (error) {
      toast.error('Error al insertar en la ruta');
    } else {
      // Recalculate times for all trips after this position to maintain sequence
      await recalculateTimesFromPosition(targetSection, passenger.route, insertPosition, interval);

      toast.success(`${passenger.name} añadido a las ${calculatedTime}. Los horarios se han reordenado automáticamente.`, { duration: 4000 });
      showOperatorConfirmation({ actionType: 'insert', description: `${passenger.name} añadido a las ${calculatedTime}`, table: 'Horarios/Viajes', route: passenger.route });
      setIsInsertToRouteDialogOpen(false);
      loadData();
    }
  };

  // Get users not yet in a specific section (filtered by route)
  const getAvailableUsersForSection = (section: string) => {
    const sectionPassengerIds = trips
      .filter(t => t.schedule_section === section && t.route === selectedRouteFilter && t.is_active)
      .map(t => t.passenger_id);
    return passengers.filter(p => p.route === selectedRouteFilter && !sectionPassengerIds.includes(p.id) && p.is_active);
  };

  if (!isAdmin && !isMatia) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <SheetTrigger asChild>
          <Button variant="outline" size="lg" className="gap-3 font-extrabold text-base px-6 py-3 shadow-md bg-white text-foreground hover:bg-white/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
            <Settings size={24} strokeWidth={2.5} />
            <span className="hidden sm:inline">Gestionar</span>
          </Button>
        </SheetTrigger>
      )}
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Panel de Administración</SheetTitle>
          <SheetDescription>Gestiona usuarios y horarios del servicio de transporte</SheetDescription>
          <div className="pt-2 flex gap-2 flex-wrap">
            <NotificationManager />
            <MonthlyExcelExport />
            <AttendanceStats />
            <ChangeHistoryButton />
          </div>
        </SheetHeader>

        <Tabs value={usersOnlyMode ? "passengers" : activeTab} onValueChange={setActiveTab} className="mt-6">
          {/* Route and User filter selectors */}
          <div className="flex gap-2 mb-4">
            {/* Filtrar por Ruta */}
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <Route size={14} />
                Filtrar por Ruta
              </Label>
              <Select value={selectedRouteFilter} onValueChange={(value) => {
                setSelectedRouteFilter(value);
                setSelectedUserFilter(''); // Reset user filter when route changes
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar ruta..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled className="text-muted-foreground italic">
                    Seleccionar ruta...
                  </SelectItem>
                  {ROUTES.map((route) => (
                    <SelectItem key={route.value} value={route.value}>
                      {route.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtrar por Usuario */}
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <Users size={14} />
                Filtrar por Usuario
              </Label>
              <UserFilterCombobox
                value={selectedUserFilter}
                onValueChange={setSelectedUserFilter}
                passengers={passengers}
              />
            </div>
          </div>

          {!usersOnlyMode && (
            <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/80 p-1">
              <TabsTrigger value="passengers" className="gap-2 text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
                <Users size={16} strokeWidth={2.5} />
                Usuarios
              </TabsTrigger>
              <TabsTrigger value="trips" className="gap-2 text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
                <Clock size={16} strokeWidth={2.5} />
                Horarios
              </TabsTrigger>
              <TabsTrigger value="incidencias" className="gap-2 text-sm font-bold data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground data-[state=active]:shadow relative text-destructive">
                <MessageSquare size={16} strokeWidth={2.5} />
                Incidencias
              </TabsTrigger>
              <TabsTrigger value="tracking" className="gap-2 text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">
                <MapPin size={16} strokeWidth={2.5} />
                Seguimiento
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="passengers" className="space-y-4 mt-4">
            {/* Show message when no route is selected */}
            {!selectedRouteFilter && !selectedUserFilter ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium">Selecciona una ruta o un usuario</p>
                <p className="text-sm mt-1">Usa los filtros de arriba para ver los datos</p>
              </div>
            ) : (
              <>
                <Button onClick={() => openPassengerDialog()} className="w-full gap-1" disabled={!selectedRouteFilter}>
                  <UserPlus size={14} />
                  Nuevo Usuario {selectedRouteFilter ? `(${selectedRouteFilter})` : ''}
                </Button>

                {/* Search by name with route selector */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre..."
                      value={passengerSearchName}
                      onChange={(e) => setPassengerSearchName(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {passengerSearchName && selectedRouteFilter && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Buscar en:</Label>
                      <Select value={passengerSearchRouteFilter} onValueChange={setPassengerSearchRouteFilter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current">Ruta actual ({selectedRouteFilter})</SelectItem>
                          <SelectItem value="all">Todas las rutas</SelectItem>
                          {ROUTES.filter(r => r.value !== selectedRouteFilter).map((route) => (
                            <SelectItem key={route.value} value={route.value}>
                              {route.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                  {passengers
                    .filter((p) => {
                      // If a specific user is selected, only show that user
                      if (selectedUserFilter && selectedUserFilter !== 'all') {
                        return p.id === selectedUserFilter;
                      }
                      // If no route selected, show nothing (handled above)
                      if (!selectedRouteFilter) return false;
                      // Route filter logic
                      if (!passengerSearchName) {
                        // No search: show only current route
                        return p.route === selectedRouteFilter;
                      }
                      // When searching, use the search route filter
                      if (passengerSearchRouteFilter === 'current') {
                        return p.route === selectedRouteFilter;
                      }
                      if (passengerSearchRouteFilter === 'all') {
                        return true; // Show all routes
                      }
                      return p.route === passengerSearchRouteFilter;
                    })
                .filter((p) => 
                  passengerSearchName === '' || 
                  p.name.toLowerCase().includes(passengerSearchName.toLowerCase())
                )
                .sort((a, b) => {
                  // Inactive users go to the end
                  if (a.is_active !== b.is_active) {
                    return a.is_active ? -1 : 1;
                  }
                  // Sort by registration_number (route order)
                  const aNum = a.registration_number ?? 9999;
                  const bNum = b.registration_number ?? 9999;
                  return aNum - bNum;
                })
                .map((p, index) => {
                  const isInactive = !p.is_active;
                  const showRouteLabel = (selectedUserFilter && selectedUserFilter !== 'all') || (passengerSearchName && passengerSearchRouteFilter !== 'current' && p.route !== selectedRouteFilter);
                  const routeLabel = ROUTES.find(r => r.value === p.route)?.label || p.route;
                  const passengerNote = passengerNotes.find(n => n.passenger_id === p.id);
                  const hasNote = !!passengerNote;
                  return (
                    <Card key={p.id} className={`p-3 ${isInactive ? 'opacity-50 bg-muted' : ''} ${hasNote ? 'ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-900/20' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0 ${isInactive ? 'bg-destructive/10 text-destructive' : hasNote ? 'bg-amber-500 text-white' : 'bg-primary/10 text-primary'}`}>
                            {isInactive ? <UserX size={14} /> : hasNote ? <MessageSquareWarning size={14} /> : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className={`font-medium truncate ${isInactive ? 'line-through text-muted-foreground' : ''}`}>
                                {p.name}
                                {isInactive && <span className="ml-2 text-xs text-destructive font-normal">(BAJA)</span>}
                              </p>
                              {hasNote && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                                  onClick={() => {
                                    setViewingNotePassenger(p);
                                    setIsNoteDialogOpen(true);
                                  }}
                                  title="Ver aviso"
                                >
                                  <MessageSquareWarning size={12} className="mr-0.5" />
                                  <span className="text-[10px] font-bold">AVISO</span>
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {showRouteLabel && (
                                <span className="font-semibold text-primary mr-1">[{routeLabel}]</span>
                              )}
                              {p.contact_name} - {p.contact_phone}
                            </p>
                            {/* Schedule times for this passenger */}
                            {(() => {
                              const passengerTrips = trips
                                .filter(t => t.passenger_id === p.id && t.is_active)
                                .sort((a, b) => {
                                  const isMorningA = a.schedule_section.toLowerCase().includes('morning');
                                  const isMorningB = b.schedule_section.toLowerCase().includes('morning');
                                  if (isMorningA !== isMorningB) return isMorningA ? -1 : 1;
                                  const [hA, mA] = a.scheduled_time.split(':').map(Number);
                                  const [hB, mB] = b.scheduled_time.split(':').map(Number);
                                  return (hA * 60 + mA) - (hB * 60 + mB);
                                });
                              const routeSections = getRouteSections(p.route);
                              const assignedSectionIds = passengerTrips.map(t => t.schedule_section);
                              const hasUnassigned = routeSections.some(s => !assignedSectionIds.includes(s.value));
                              return (
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  {passengerTrips.map(t => {
                                    const isMorning = t.schedule_section.toLowerCase().includes('morning');
                                    const sectionLabel = routeSections.find(s => s.value === t.schedule_section)?.label;
                                    const shortLabel = sectionLabel ? sectionLabel.split(' - ')[0] : (isMorning ? 'Mañana' : 'Tarde');
                                      return (
                                      <span key={t.id} className="inline-flex items-center gap-0">
                                        <button
                                          className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-l-full cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all ${
                                            isMorning
                                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                          }`}
                                          title={`Editar: ${sectionLabel || t.schedule_section}`}
                                          onClick={() => openTripDialog(t)}
                                        >
                                          <Clock size={9} />
                                          {t.scheduled_time}
                                          {t.pickup_location && (
                                            <span className="text-[9px] opacity-75 ml-0.5">· {t.pickup_location}</span>
                                          )}
                                        </button>
                                        <button
                                          className={`inline-flex items-center justify-center h-full px-1 py-0.5 rounded-r-full cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors ${
                                            isMorning
                                              ? 'bg-amber-200/70 text-amber-500 dark:bg-amber-800/40 dark:text-amber-400'
                                              : 'bg-blue-200/70 text-blue-500 dark:bg-blue-800/40 dark:text-blue-400'
                                          }`}
                                          title="Eliminar horario"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteTrip(t.id);
                                          }}
                                        >
                                          <X size={9} strokeWidth={3} />
                                        </button>
                                      </span>
                                    );
                                  })}
                                  {passengerTrips.length === 0 && (
                                    <span className="text-[10px] text-muted-foreground italic">Sin horarios asignados</span>
                                  )}
                                </div>
                              );
                            })()}
                            {/* Attendance stats indicator */}
                            {(() => {
                              const stats = getStatsForPassenger(p.name, p.route);
                              if (!stats || stats.totalRecords === 0) {
                                return (
                                  <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                    <span className="text-muted-foreground italic">
                                      📊 Sin datos (30d)
                                    </span>
                                  </div>
                                );
                              }
                              const rateColor = stats.attendanceRate >= 90 
                                ? 'text-green-600 dark:text-green-400' 
                                : stats.attendanceRate >= 70 
                                  ? 'text-amber-600 dark:text-amber-400' 
                                  : 'text-red-600 dark:text-red-400';
                              return (
                                <div className="flex flex-wrap items-center gap-2 text-[10px] mt-0.5">
                                  <span className={`font-semibold ${rateColor}`}>
                                    📊 {stats.attendanceRate}% asist. ({stats.totalRecords} reg.)
                                  </span>
                                  {stats.absencesLast30Days > 0 && (
                                    <span className="text-amber-600 dark:text-amber-400">
                                      ⚠️ {stats.absencesLast30Days} falta{stats.absencesLast30Days > 1 ? 's' : ''} (30d)
                                    </span>
                                  )}
                                  {stats.lateCount > 0 && (
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                                      🕐 {stats.lateCount} retraso{stats.lateCount > 1 ? 's' : ''} (30d)
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button variant="ghost" size="icon" onClick={() => openPassengerDialog(p)} title="Editar">
                            <Pencil size={14} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" title="Historial">
                                <ClipboardList size={14} className="text-blue-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => loadAbsenceHistory(p)} className="gap-2">
                                <UserX size={14} className="text-red-500" />
                                Historial de Faltas
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => loadLateHistory(p)} className="gap-2">
                                <Timer size={14} className="text-amber-500" />
                                Historial de Retrasos
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {p.is_active ? (
                            <Button variant="ghost" size="icon" onClick={() => deactivatePassenger(p.id)} title="Dar de baja">
                              <UserX size={14} className="text-amber-500" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => reactivatePassenger(p.id)} title="Dar de alta">
                              <UserCheck size={14} className="text-green-500" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => deletePassenger(p.id)} title="Eliminar definitivamente">
                            <Trash2 size={14} className="text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="trips" className="space-y-4 mt-4">
            {/* Show message when no route or user is selected */}
            {!selectedRouteFilter && !selectedUserFilter ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium">Selecciona una ruta o un usuario</p>
                <p className="text-sm mt-1">Usa los filtros de arriba para ver los horarios</p>
              </div>
            ) : (
              <>
                <Button onClick={() => openTripDialog()} className="w-full gap-1" disabled={!selectedRouteFilter && !selectedUserFilter}>
                  <Plus size={14} />
                  Nuevo Horario
                </Button>

                {/* Search by user name */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre de usuario..."
                    value={tripSearchName}
                    onChange={(e) => setTripSearchName(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* When a specific user is selected, show their trips from their route */}
                {(() => {
                  // Determine which route to use for sections
                  const selectedPassenger = selectedUserFilter && selectedUserFilter !== 'all' 
                    ? passengers.find(p => p.id === selectedUserFilter) 
                    : null;
                  const effectiveRoute = selectedPassenger ? selectedPassenger.route : selectedRouteFilter;
                  const sectionsToShow = getRouteSections(effectiveRoute);

                  // Show indicator when viewing a different route due to user filter
                  const isViewingDifferentRoute = selectedPassenger && selectedPassenger.route !== selectedRouteFilter;

                  return (
                    <>
                      {isViewingDifferentRoute && (
                        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm text-primary flex items-center gap-2">
                          <Users size={16} />
                          <span>
                            Mostrando horarios de <strong>{selectedPassenger.name}</strong> en ruta <strong>{selectedPassenger.route}</strong>
                          </span>
                        </div>
                      )}

                      {sectionsToShow.map((section) => {
                        const sectionTrips = trips
                          .filter((t) => {
                            // Base filters: section and active
                            if (t.schedule_section !== section.value || !t.is_active) return false;
                            
                            // If a specific user is selected, filter by that user and their route
                            if (selectedUserFilter && selectedUserFilter !== 'all') {
                              return t.passenger_id === selectedUserFilter && t.route === effectiveRoute;
                            }
                            
                            // Otherwise use the selected route filter
                            return t.route === selectedRouteFilter;
                          })
                          .filter((t) => 
                            tripSearchName === '' || 
                            t.passengers?.name?.toLowerCase().includes(tripSearchName.toLowerCase())
                          )
                          .sort((a, b) => {
                            // Sort by scheduled_time chronologically
                            const timeA = a.scheduled_time.split(':').map(Number);
                            const timeB = b.scheduled_time.split(':').map(Number);
                            const minutesA = timeA[0] * 60 + (timeA[1] || 0);
                            const minutesB = timeB[0] * 60 + (timeB[1] || 0);
                            return minutesA - minutesB;
                          });
                        const availableUsers = getAvailableUsersForSection(section.value);

                        return (
                          <Card key={section.value}>
                            <CardHeader className="py-2 px-3">
                              <CardTitle className="text-sm">{section.label}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-2 space-y-1">
                              {sectionTrips.map((t, idx) => (
                                <div key={t.id}>
                                  <div className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="text-xs text-muted-foreground font-mono w-5">{idx + 1}</span>
                                      <span className="font-mono font-medium">{t.scheduled_time}</span>
                                      <span className="truncate">{t.passengers?.name || 'Sin asignar'}</span>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTripDialog(t)}>
                                        <Pencil size={12} />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTrip(t.id)}>
                                        <Trash2 size={12} className="text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {sectionTrips.length === 0 && (
                                <div className="text-center py-4 text-muted-foreground text-sm">
                                  {tripSearchName 
                                    ? 'No se encontraron resultados' 
                                    : selectedUserFilter && selectedUserFilter !== 'all'
                                      ? 'Este usuario no tiene horarios en esta sección'
                                      : 'No hay horarios en esta sección'}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </>
                  );
                })()}
              </>
            )}
          </TabsContent>
          <TabsContent value="incidencias" className="mt-4">
            <IncidenciasEmpresaPanel />
          </TabsContent>
          <TabsContent value="tracking" className="mt-4">
            <TrackingAdminPanel />
          </TabsContent>

        </Tabs>

        {/* Passenger Dialog */}
        <Dialog open={isPassengerDialogOpen} onOpenChange={setIsPassengerDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPassenger ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
              <DialogDescription>Completa los datos del usuario</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={passengerForm.name}
                    onChange={(e) => setPassengerForm({ ...passengerForm, name: e.target.value })}
                    placeholder="Nombre completo"
                  />
                </div>
              </div>
              <div>
                <Label>Dirección</Label>
                <Input
                  value={passengerForm.location}
                  onChange={(e) => setPassengerForm({ ...passengerForm, location: e.target.value })}
                  placeholder="Dirección de recogida"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Contacto (nombre)</Label>
                  <Input
                    value={passengerForm.contact_name}
                    onChange={(e) => setPassengerForm({ ...passengerForm, contact_name: e.target.value })}
                    placeholder="Nombre familiar"
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={passengerForm.contact_phone}
                    onChange={(e) => setPassengerForm({ ...passengerForm, contact_phone: e.target.value })}
                    placeholder="600123456"
                  />
                </div>
              </div>
              <div>
                <Label>Tipo de viaje</Label>
                <Select
                  value={passengerForm.trip_type || 'none'}
                  onValueChange={(v) => setPassengerForm({ ...passengerForm, trip_type: v === 'none' ? '' : v as '' | 'S' | 'B' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    <SelectItem value="S">S - Silla</SelectItem>
                    <SelectItem value="B">B - Bipedestación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              
              {/* Route selection - for both new and existing passengers */}
              <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Route size={16} className="text-primary" />
                  <Label className="font-semibold">Rutas asignadas *</Label>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {(() => {
                    const passengerRoute = editingPassenger ? editingPassenger.route : selectedRouteFilter;
                    const routeSections = getRouteSections(passengerRoute);
                    return routeSections.map((section) => {
                      const existingTrip = editingPassenger 
                        ? trips.find(t => t.passenger_id === editingPassenger.id && t.schedule_section === section.value && t.is_active)
                        : null;
                      const isSelected = selectedRoutes.includes(section.value);
                      const isMorning = section.value.toLowerCase().includes('morning');
                      
                      // Calculate estimated time for new assignments
                      const sectionTrips = trips.filter(
                        t => t.schedule_section === section.value && t.route === passengerRoute && t.is_active
                      );
                      let estimatedTime = '';
                      if (sectionTrips.length === 0) {
                        estimatedTime = DEFAULT_TIMES[section.value] || (isMorning ? '08:00' : '15:00');
                      } else {
                        const interval = detectInterval(sectionTrips);
                        const sortedTrips = [...sectionTrips].sort((a, b) => a.sort_order - b.sort_order);
                        const lastTrip = sortedTrips[sortedTrips.length - 1];
                        estimatedTime = minutesToTime(timeToMinutes(lastTrip.scheduled_time) + interval);
                      }
                      
                      return (
                        <div 
                          key={section.value} 
                          className={`flex items-center justify-between p-2 rounded border ${
                            isSelected ? 'bg-primary/10 border-primary/30' : 'bg-background'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRoutes([...selectedRoutes, section.value]);
                                  // Pre-fill time: use existing trip time or estimated
                                  if (existingTrip) {
                                    setRouteCustomTimes(prev => ({ ...prev, [section.value]: existingTrip.scheduled_time }));
                                  }
                                } else {
                                  setSelectedRoutes(selectedRoutes.filter(r => r !== section.value));
                                  const newTimes = { ...routeCustomTimes };
                                  delete newTimes[section.value];
                                  setRouteCustomTimes(newTimes);
                                }
                              }}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm">{section.label}</span>
                              {!isSelected && (
                                <span className="text-[10px] text-muted-foreground">
                                  ⏰ Hora estimada: {estimatedTime}
                                </span>
                              )}
                            </div>
                          </label>
                          
                          {/* Time input - shown for both new and editing */}
                          {isSelected && (
                            <Input
                              type="text"
                              placeholder={existingTrip?.scheduled_time || estimatedTime}
                              value={routeCustomTimes[section.value] || existingTrip?.scheduled_time || ''}
                              onChange={(e) => setRouteCustomTimes({
                                ...routeCustomTimes,
                                [section.value]: e.target.value
                              })}
                              className="w-20 h-7 text-sm text-center"
                            />
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
                {selectedRoutes.length === 0 && (
                  <p className="text-xs text-destructive">⚠️ Selecciona al menos una ruta</p>
                )}
              </div>

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPassengerDialogOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={savePassenger} disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Trip Dialog */}
        <Dialog open={isTripDialogOpen} onOpenChange={setIsTripDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTrip ? 'Editar Horario' : 'Nuevo Horario'}</DialogTitle>
              <DialogDescription>Configura el horario del viaje</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Usuario</Label>
                <Select
                  value={tripForm.passenger_id || 'none'}
                  onValueChange={(v) => setTripForm({ ...tripForm, passenger_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar usuario..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {passengers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sección *</Label>
                <Select
                  value={tripForm.schedule_section}
                  onValueChange={(v) => setTripForm({ ...tripForm, schedule_section: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Hora *</Label>
                  <Input
                    value={tripForm.scheduled_time}
                    onChange={(e) => setTripForm({ ...tripForm, scheduled_time: e.target.value })}
                    placeholder="9:30"
                  />
                </div>
              </div>
              <div className="relative">
                <Label>Ubicación/Parada</Label>
                <Input
                  value={tripForm.pickup_location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  onFocus={() => {
                    const suggestions = getExistingLocations(tripForm.schedule_section, selectedRouteFilter);
                    if (suggestions.length > 0) {
                      setLocationSuggestions(suggestions);
                      setShowLocationSuggestions(true);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                  placeholder="Escribe o selecciona una parada..."
                />
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {locationSuggestions.map((loc, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 hover:bg-accent cursor-pointer text-sm flex items-center gap-2"
                        onMouseDown={() => selectLocationSuggestion(loc)}
                      >
                        <MapPin size={14} className="text-muted-foreground" />
                        {loc}
                      </div>
                    ))}
                  </div>
                )}
                {isNewLocation && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-amber-500 rounded-full"></span>
                    Parada nueva - se reorganizarán los horarios posteriores
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTripDialogOpen(false)}>Cancelar</Button>
              <Button onClick={saveTrip}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Insert User to Route Dialog */}
        <Dialog open={isInsertToRouteDialogOpen} onOpenChange={setIsInsertToRouteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insertar Usuario en Ruta</DialogTitle>
              <DialogDescription>
                Selecciona un usuario para añadirlo a{' '}
                <strong>{SECTIONS.find(s => s.value === insertRouteSection)?.label}</strong>.
                Se insertará según su número de orden.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {getAvailableUsersForSection(insertRouteSection).length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Todos los usuarios ya están en esta ruta
                </p>
              ) : (
                getAvailableUsersForSection(insertRouteSection)
                  .sort((a, b) => (a.registration_number || 0) - (b.registration_number || 0))
                  .map((p) => {
                    // Get existing routes for this passenger
                    const passengerTrips = trips.filter(t => t.passenger_id === p.id && t.is_active);
                    const assignedSections = [...new Set(passengerTrips.map(t => t.schedule_section))];
                    
                    return (
                      <Card 
                        key={p.id} 
                        className="p-3 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => insertUserToRoute(p.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                            {p.registration_number || '-'}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{p.name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin size={12} />
                              <span>{p.location || 'Sin dirección'}</span>
                            </div>
                            {assignedSections.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <Route size={12} className="text-primary" />
                                <div className="flex flex-wrap gap-1">
                                  {assignedSections.map(section => {
                                    const sectionLabel = SECTIONS.find(s => s.value === section)?.label || section;
                                    const tripTime = passengerTrips.find(t => t.schedule_section === section)?.scheduled_time;
                                    return (
                                      <span 
                                        key={section} 
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-[10px] font-medium text-primary"
                                      >
                                        <Clock size={10} />
                                        {tripTime} - {sectionLabel.split(' - ')[0]}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          <UserRoundPlus size={18} className="text-primary" />
                        </div>
                      </Card>
                    );
                  })
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInsertToRouteDialogOpen(false)}>Cancelar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Schedule from User Card Dialog */}
        <Dialog open={isAssignScheduleDialogOpen} onOpenChange={setIsAssignScheduleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock size={18} />
                Asignar Horario a {assignSchedulePassenger?.name}
              </DialogTitle>
              <DialogDescription>
                Selecciona la sección donde insertar a este usuario. Se calculará la hora automáticamente según su posición.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {assignSchedulePassenger && (() => {
                const routeSections = getRouteSections(assignSchedulePassenger.route);
                const assignedSectionIds = trips
                  .filter(t => t.passenger_id === assignSchedulePassenger.id && t.is_active)
                  .map(t => t.schedule_section);
                const availableSections = routeSections.filter(s => !assignedSectionIds.includes(s.value));

                if (availableSections.length === 0) {
                  return (
                    <p className="text-center text-muted-foreground py-4">
                      Este usuario ya está asignado a todas las secciones
                    </p>
                  );
                }

                return availableSections.map(section => {
                  const sectionTrips = trips.filter(
                    t => t.schedule_section === section.value && t.route === assignSchedulePassenger.route && t.is_active
                  );
                  const isMorning = section.value.toLowerCase().includes('morning');
                  const existingCount = sectionTrips.length;
                  
                  // Calculate what time the new trip would get
                  let estimatedTime = '';
                  if (existingCount === 0) {
                    estimatedTime = DEFAULT_TIMES[section.value] || (isMorning ? '08:00' : '15:00');
                  } else {
                    const interval = detectInterval(sectionTrips);
                    const sortedTrips = [...sectionTrips].sort((a, b) => a.sort_order - b.sort_order);
                    const lastTrip = sortedTrips[sortedTrips.length - 1];
                    estimatedTime = minutesToTime(timeToMinutes(lastTrip.scheduled_time) + interval);
                  }

                  return (
                    <Card
                      key={section.value}
                      className="p-3 cursor-pointer hover:bg-accent transition-colors"
                      onClick={async () => {
                        await insertUserToRoute(assignSchedulePassenger.id, section.value);
                        setIsAssignScheduleDialogOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            isMorning
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {isMorning ? '☀️' : '🌙'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{section.label}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{existingCount} usuario{existingCount !== 1 ? 's' : ''}</span>
                              <span>·</span>
                              <span className="font-semibold text-primary">
                                ⏰ Hora estimada: {estimatedTime}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Plus size={18} className="text-primary" />
                      </div>
                    </Card>
                  );
                });
              })()}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignScheduleDialogOpen(false)}>Cancelar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Passenger Note Dialog */}
        <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <MessageSquareWarning size={20} />
                Aviso de Usuario
              </DialogTitle>
              <DialogDescription>
                Nota especial para {viewingNotePassenger?.name}
              </DialogDescription>
            </DialogHeader>
            {viewingNotePassenger && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                    {passengerNotes.find(n => n.passenger_id === viewingNotePassenger.id)?.message || 'Sin aviso'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Creado: {passengerNotes.find(n => n.passenger_id === viewingNotePassenger.id)?.created_at 
                    ? new Date(passengerNotes.find(n => n.passenger_id === viewingNotePassenger.id)!.created_at).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '-'}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Absence / Late History Dialog */}
        <Dialog open={isAbsenceHistoryOpen} onOpenChange={(open) => {
          setIsAbsenceHistoryOpen(open);
          if (!open) {
            setAbsencePeriodFilter('all');
          }
        }}>
          <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {historyMode === 'absences' ? (
                  <>
                    <ClipboardList size={20} className="text-blue-500" />
                    Historial de Faltas
                  </>
                ) : (
                  <>
                    <Timer size={20} className="text-amber-500" />
                    Historial de Retrasos
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {historyMode === 'absences' 
                  ? `Registros de ausencia de ${viewingAbsencePassenger?.name}`
                  : `Registros de retraso de ${viewingAbsencePassenger?.name}`
                }
              </DialogDescription>
            </DialogHeader>
            
            {/* Mode tabs + Period Filter */}
            <div className="flex flex-wrap items-center gap-3 py-2 border-b">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                <Button
                  variant={historyMode === 'absences' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    if (historyMode !== 'absences' && viewingAbsencePassenger) {
                      loadAbsenceHistory(viewingAbsencePassenger, absencePeriodFilter);
                    }
                  }}
                >
                  <UserX size={13} />
                  Faltas
                </Button>
                <Button
                  variant={historyMode === 'lates' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    if (historyMode !== 'lates' && viewingAbsencePassenger) {
                      loadLateHistory(viewingAbsencePassenger, absencePeriodFilter);
                    }
                  }}
                >
                  <Timer size={13} />
                  Retrasos
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">Período:</Label>
                <Select value={absencePeriodFilter} onValueChange={handleAbsencePeriodChange}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30d">Últimos 30 días</SelectItem>
                    <SelectItem value="3m">Últimos 3 meses</SelectItem>
                    <SelectItem value="6m">Últimos 6 meses</SelectItem>
                    <SelectItem value="12m">Últimos 12 meses</SelectItem>
                    <SelectItem value="all">Todo (histórico completo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {isLoadingAbsences ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando...
                </div>
              ) : historyMode === 'absences' ? (
                /* Absences content */
                absenceHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay registros de faltas en este período
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Fecha</th>
                            <th className="text-left px-3 py-2 font-medium">Ruta</th>
                            <th className="text-left px-3 py-2 font-medium">Hora prog.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {absenceHistory.map((record, idx) => (
                            <tr key={record.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                              <td className="px-3 py-2">
                                {new Date(record.record_date).toLocaleDateString('es-ES', {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="px-3 py-2 text-purple-800 dark:text-purple-400 font-bold">
                                {record.route || '-'}
                              </td>
                              <td className="px-3 py-2 font-mono">
                                {record.scheduled_time || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Total: {absenceHistory.length} falta{absenceHistory.length !== 1 ? 's' : ''} registrada{absenceHistory.length !== 1 ? 's' : ''}
                      {absencePeriodFilter !== 'all' && ' (en el período seleccionado)'}
                    </p>
                  </>
                )
              ) : (
                /* Lates content */
                lateHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay registros de retrasos en este período
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Fecha</th>
                            <th className="text-left px-3 py-2 font-medium">Ruta</th>
                            <th className="text-left px-3 py-2 font-medium">Hora prog.</th>
                            <th className="text-left px-3 py-2 font-medium">Llegada</th>
                            <th className="text-left px-3 py-2 font-medium">Retraso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lateHistory.map((record, idx) => {
                            // Extract delay from actual_time (e.g. "08:35 T+5min")
                            const delayMatch = record.actual_time?.match(/T\+(\d+)/);
                            const delayMin = delayMatch ? delayMatch[1] : '?';
                            const arrivalTime = record.actual_time?.split(' ')[0] || '-';
                            
                            return (
                              <tr key={record.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                                <td className="px-3 py-2">
                                  {new Date(record.record_date).toLocaleDateString('es-ES', {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </td>
                                <td className="px-3 py-2 text-purple-800 dark:text-purple-400 font-bold">
                                  {record.route || '-'}
                                </td>
                                <td className="px-3 py-2 font-mono">
                                  {record.scheduled_time || '-'}
                                </td>
                                <td className="px-3 py-2 font-mono">
                                  {arrivalTime}
                                </td>
                                <td className="px-3 py-2 font-mono font-bold text-red-600 dark:text-red-400">
                                  +{delayMin} min
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Total: {lateHistory.length} retraso{lateHistory.length !== 1 ? 's' : ''} registrado{lateHistory.length !== 1 ? 's' : ''}
                      {absencePeriodFilter !== 'all' && ' (en el período seleccionado)'}
                    </p>
                  </>
                )
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              {((historyMode === 'absences' && absenceHistory.length > 0) || (historyMode === 'lates' && lateHistory.length > 0)) && (
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    if (!viewingAbsencePassenger) return;
                    
                    if (historyMode === 'absences') {
                      const exportData = absenceHistory.map(record => ({
                        'Fecha': new Date(record.record_date).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        }),
                        'Ruta': record.route || '-',
                        'Hora Programada': record.scheduled_time || '-'
                      }));
                      
                      const wb = XLSX.utils.book_new();
                      const ws = XLSX.utils.json_to_sheet(exportData);
                      ws['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 15 }];
                      XLSX.utils.book_append_sheet(wb, ws, 'Historial Faltas');
                      
                      const periodLabel = absencePeriodFilter === 'all' ? 'completo' : absencePeriodFilter;
                      const safeName = viewingAbsencePassenger.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '').substring(0, 30);
                      const filename = `Faltas_${safeName}_${periodLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
                      XLSX.writeFile(wb, filename);
                    } else {
                      const exportData = lateHistory.map(record => {
                        const delayMatch = record.actual_time?.match(/T\+(\d+)/);
                        const delayMin = delayMatch ? delayMatch[1] : '?';
                        const arrivalTime = record.actual_time?.split(' ')[0] || '-';
                        return {
                          'Fecha': new Date(record.record_date).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          }),
                          'Ruta': record.route || '-',
                          'Hora Programada': record.scheduled_time || '-',
                          'Hora Llegada': arrivalTime,
                          'Retraso (min)': `+${delayMin}`
                        };
                      });
                      
                      const wb = XLSX.utils.book_new();
                      const ws = XLSX.utils.json_to_sheet(exportData);
                      ws['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
                      XLSX.utils.book_append_sheet(wb, ws, 'Historial Retrasos');
                      
                      const periodLabel = absencePeriodFilter === 'all' ? 'completo' : absencePeriodFilter;
                      const safeName = viewingAbsencePassenger.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '').substring(0, 30);
                      const filename = `Retrasos_${safeName}_${periodLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
                      XLSX.writeFile(wb, filename);
                    }
                    toast.success('Historial exportado correctamente');
                  }}
                  className="gap-2"
                >
                  <Download size={16} />
                  Exportar Excel
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsAbsenceHistoryOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Schedule Adjustment Confirmation Dialog */}
        <Dialog open={isAiAdjustDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAiAdjustDialogOpen(false);
            setPendingAiSaveData(null);
            setAiAdjustments([]);
            setAiUnchanged([]);
            setAiAnalysis('');
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Ajuste de horarios con IA
              </DialogTitle>
              <DialogDescription>
                La IA ha analizado el cambio de dirección y propone los siguientes ajustes. Confirma para aplicarlos.
              </DialogDescription>
            </DialogHeader>

            {aiAnalysis && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-sm text-foreground whitespace-pre-line">{aiAnalysis}</p>
              </div>
            )}

            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {aiAdjustments.filter(a => a.old_time !== a.new_time).length > 0 && (
                  <>
                    <p className="text-sm font-semibold flex items-center gap-1 text-destructive">
                      <AlertTriangle size={14} />
                      Horarios que cambiarán:
                    </p>
                    {aiAdjustments.filter(a => a.old_time !== a.new_time).map((adj, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md border p-2 bg-destructive/5">
                        <span className="text-sm font-medium truncate max-w-[40%]">{adj.passenger_name}</span>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground line-through">{adj.old_time}</span>
                          <ArrowRight size={14} className="text-destructive" />
                          <span className="font-bold text-destructive">{adj.new_time}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {aiAdjustments.filter(a => a.old_time === a.new_time).length > 0 && (
                  <>
                    <p className="text-sm font-semibold text-muted-foreground mt-3">Sin cambio:</p>
                    {aiAdjustments.filter(a => a.old_time === a.new_time).map((adj, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md border p-2 opacity-60">
                        <span className="text-sm truncate max-w-[50%]">{adj.passenger_name}</span>
                        <span className="text-sm">{adj.old_time}</span>
                      </div>
                    ))}
                  </>
                )}

                {aiUnchanged.length > 0 && aiAdjustments.filter(a => a.old_time === a.new_time).length === 0 && (
                  <>
                    <p className="text-sm font-semibold text-muted-foreground mt-3">Sin cambio:</p>
                    {aiUnchanged.map((u, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md border p-2 opacity-60">
                        <span className="text-sm truncate max-w-[50%]">{u.passenger_name}</span>
                        <span className="text-sm">{u.time}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAiAdjustDialogOpen(false);
                  // Save without AI adjustments - just update location
                  if (pendingAiSaveData) {
                    const { editingPassenger: ep, passengerData: pd } = pendingAiSaveData;
                    supabase.from('passengers').update(pd).eq('id', ep.id).then(() => {
                      const ct = trips.filter(t => t.passenger_id === ep.id && t.is_active);
                      ct.forEach(t => {
                        supabase.from('schedule_trips').update({ pickup_location: pd.location, updated_at: new Date().toISOString() }).eq('id', t.id);
                      });
                      toast.info('Dirección actualizada sin ajustar horarios');
                      loadData();
                    });
                  }
                  setPendingAiSaveData(null);
                  setAiAdjustments([]);
                  setAiUnchanged([]);
                  setAiAnalysis('');
                }}
              >
                Solo guardar dirección
              </Button>
              <Button
                onClick={applyAiAdjustments}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? 'Aplicando...' : (
                  <>
                    <Bot size={16} />
                    Confirmar ajustes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </SheetContent>
      </Sheet>

      <Dialog open={collisionDialogOpen} onOpenChange={(open) => { if (!open) handleCollisionCancel(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={20} />
              Colisión de horario detectada
            </DialogTitle>
            <DialogDescription>
              El horario <strong>{collisionData?.newTime}</strong> en la sección <strong>{collisionData?.section}</strong> ya está asignado a otro usuario. Revisa la tabla y elige cómo proceder.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[320px]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium text-muted-foreground">Usuario</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Hora actual</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Hora nueva</th>
                </tr>
              </thead>
              <tbody>
                {collisionData?.previewRows.map((row, i) => (
                  <tr
                    key={i}
                    className={
                      row.isNew
                        ? 'bg-primary/10 font-semibold'
                        : row.willMove
                        ? 'bg-accent/50'
                        : ''
                    }
                  >
                    <td className="p-2 flex items-center gap-1">
                      {row.name}
                      {row.isNew && <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">NUEVO</span>}
                      {row.willMove && <ArrowRight size={14} className="text-destructive" />}
                    </td>
                    <td className="p-2 text-center">{row.currentTime}</td>
                    <td className="p-2 text-center font-medium">
                      {row.willMove || row.isNew ? row.newTime : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button variant="outline" onClick={handleCollisionCancel}>
              Cancelar
            </Button>
            <Button variant="secondary" onClick={handleCollisionSaveWithout} disabled={isSaving}>
              Solo guardar sin ajustar
            </Button>
            <Button onClick={handleCollisionConfirmAdjust} disabled={isSaving}>
              {isSaving ? 'Aplicando...' : 'Confirmar ajuste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SchedulePreviewModal
        open={isPreviewModalOpen}
        onOpenChange={(open) => {
          setIsPreviewModalOpen(open);
          if (!open) {
            setPreviewModalChanges([]);
          }
        }}
        section={previewModalSection}
        sectionLabel={previewModalSectionLabel}
        route={previewModalRoute}
        editedTripId={previewModalTripId}
        changes={previewModalChanges}
        onConfirmed={() => {
          loadData();
        }}
      />
    </>
  );
}
