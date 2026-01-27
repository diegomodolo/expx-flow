import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Users, Heart } from 'lucide-react';
import { useCSSquadFilter } from '@/contexts/CSSquadFilterContext';

export function CSSquadFilter() {
  const { selectedSquadId, setSelectedSquadId, squads, isLoading, mySquadId, mySquadName } = useCSSquadFilter();

  const getDisplayValue = () => {
    if (selectedSquadId === null) return 'all';
    if (selectedSquadId === mySquadId) return 'my-squad';
    return selectedSquadId;
  };

  const handleChange = (value: string) => {
    if (value === 'all') {
      setSelectedSquadId(null);
    } else if (value === 'my-squad') {
      setSelectedSquadId(mySquadId);
    } else {
      setSelectedSquadId(value);
    }
  };

  return (
    <Select value={getDisplayValue()} onValueChange={handleChange} disabled={isLoading}>
      <SelectTrigger className="w-[200px]">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0" />
          <SelectValue placeholder="Filtrar por Squad" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Todos os Squads
          </span>
        </SelectItem>
        {mySquadId && (
          <SelectItem value="my-squad">
            <span className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Meu Squad ({mySquadName})
            </span>
          </SelectItem>
        )}
        {squads.map((squad) => (
          <SelectItem key={squad.id} value={squad.id}>
            <span className="flex items-center gap-2">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: squad.color || '#6B7280' }} 
              />
              {squad.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
