import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

interface Team {
  id: string;
  name: string;
  color: string | null;
}

interface CSSquadFilterContextType {
  selectedSquadId: string | null; // null = todos
  setSelectedSquadId: (id: string | null) => void;
  squads: Team[];
  isLoading: boolean;
  mySquadId: string | null; // squad do usuário logado
  mySquadName: string | null;
}

const CSSquadFilterContext = createContext<CSSquadFilterContextType | undefined>(undefined);

const STORAGE_KEY = 'cs-squad-filter';
const STORAGE_INITIALIZED_KEY = 'cs-squad-filter-initialized';

export function CSSquadFilterProvider({ children }: { children: ReactNode }) {
  const { activeCompany } = useCompany();
  
  // Estado inicial do localStorage
  const [selectedSquadId, setSelectedSquadIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });
  
  const [hasInitialized, setHasInitialized] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_INITIALIZED_KEY) === 'true';
    }
    return false;
  });

  // Buscar todos os squads da empresa
  const { data: squads = [], isLoading: isLoadingSquads } = useQuery({
    queryKey: ['cs-squads', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, color')
        .eq('company_id', activeCompany.company_id)
        .order('name');
      
      if (error) throw error;
      return data as Team[];
    },
    enabled: !!activeCompany?.company_id,
  });

  // Buscar squad do usuário logado (via employees e session do supabase)
  const { data: mySquadData } = useQuery({
    queryKey: ['my-squad', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return null;
      
      // Obter usuário logado via supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return null;
      
      const { data: employee } = await supabase
        .from('employees')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('company_id', activeCompany.company_id)
        .maybeSingle();
      
      if (!employee?.team_id) return null;
      
      const { data: team } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', employee.team_id)
        .single();
      
      return team;
    },
    enabled: !!activeCompany?.company_id,
  });

  // Setar "Meu Squad" como default na primeira visita (se o usuário tiver squad)
  useEffect(() => {
    if (!hasInitialized && mySquadData?.id) {
      setSelectedSquadIdState(mySquadData.id);
      setHasInitialized(true);
      localStorage.setItem(STORAGE_INITIALIZED_KEY, 'true');
    }
  }, [mySquadData, hasInitialized]);

  // Persistir no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedSquadId));
    }
  }, [selectedSquadId]);

  const setSelectedSquadId = (id: string | null) => {
    setSelectedSquadIdState(id);
  };

  return (
    <CSSquadFilterContext.Provider
      value={{
        selectedSquadId,
        setSelectedSquadId,
        squads,
        isLoading: isLoadingSquads,
        mySquadId: mySquadData?.id || null,
        mySquadName: mySquadData?.name || null,
      }}
    >
      {children}
    </CSSquadFilterContext.Provider>
  );
}

export function useCSSquadFilter() {
  const context = useContext(CSSquadFilterContext);
  if (context === undefined) {
    throw new Error('useCSSquadFilter must be used within a CSSquadFilterProvider');
  }
  return context;
}
