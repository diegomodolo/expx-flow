import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useCSSquadFilter } from "@/contexts/CSSquadFilterContext";

interface CSClientSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (clientId: string, clientName: string) => void;
  title?: string;
  description?: string;
}

interface ClientData {
  id: string;
  name: string;
  avatar: string | null;
  team_id: string | null;
  healthScore?: number;
  churnRiskLevel?: string;
}

export function CSClientSelectorModal({ 
  open, 
  onOpenChange, 
  onSelect,
  title = "Selecionar Cliente",
  description = "Escolha o cliente para esta ação"
}: CSClientSelectorModalProps) {
  const [search, setSearch] = useState('');
  const { activeCompany } = useCompany();
  const { selectedSquadId } = useCSSquadFilter();

  // Fetch clients directly from clients table (not just those with health config)
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['cs-clients-selector', activeCompany?.company_id, selectedSquadId],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      let query = supabase
        .from('clients')
        .select(`
          id, 
          name, 
          avatar, 
          team_id,
          client_health_config (
            health_score_total,
            churn_risk_level
          )
        `)
        .eq('company_id', activeCompany.company_id)
        .eq('is_canceled', false)
        .order('name');

      if (selectedSquadId) {
        query = query.eq('team_id', selectedSquadId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        avatar: c.avatar,
        team_id: c.team_id,
        healthScore: c.client_health_config?.[0]?.health_score_total || null,
        churnRiskLevel: c.client_health_config?.[0]?.churn_risk_level || null,
      })) as ClientData[];
    },
    enabled: !!activeCompany?.company_id && open,
    staleTime: 1000 * 60 * 2, // 2 min
  });

  // Filter by search
  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    
    const searchLower = search.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(searchLower)
    );
  }, [clients, search]);

  const handleSelect = (client: ClientData) => {
    onSelect(client.id, client.name);
    onOpenChange(false);
    setSearch('');
  };

  const getRiskBadge = (level: string | undefined) => {
    if (!level) return null;
    
    const config = {
      critical: { label: 'Crítico', className: 'text-red-600 border-red-200' },
      high: { label: 'Alto', className: 'text-orange-600 border-orange-200' },
      medium: { label: 'Médio', className: 'text-yellow-600 border-yellow-200' },
      low: { label: 'Baixo', className: 'text-green-600 border-green-200' },
    }[level];
    
    if (!config) return null;
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Client List */}
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">
                  {search.trim() ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredClients.map((client) => (
                  <Button
                    key={client.id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-3 px-3"
                    onClick={() => handleSelect(client)}
                  >
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarImage src={client.avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {client.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{client.name}</p>
                      {client.healthScore !== null && (
                        <p className="text-xs text-muted-foreground">
                          Score: {client.healthScore}%
                        </p>
                      )}
                    </div>
                    {getRiskBadge(client.churnRiskLevel)}
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
