import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Clock } from 'lucide-react';
import { ModPasajeros } from './ModPasajeros';
import { ModHorarios } from './ModHorarios';

export function ModificacionesPanel() {
  const [activeTab, setActiveTab] = useState('pasajeros');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="pasajeros" className="gap-1.5">
          <Users size={15} />
          Pasajeros
        </TabsTrigger>
        <TabsTrigger value="horarios" className="gap-1.5">
          <Clock size={15} />
          Horarios
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pasajeros">
        <ModPasajeros />
      </TabsContent>
      <TabsContent value="horarios">
        <ModHorarios />
      </TabsContent>
    </Tabs>
  );
}
