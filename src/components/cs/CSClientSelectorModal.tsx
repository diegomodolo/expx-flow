import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users } from "lucide-react";
import { useCSHealthScore360 } from "@/hooks/useCSHealthScore360";
import { useCSSquadFilter } from "@/contexts/CSSquadFilterContext";

interface CSClientSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (clientId: string, clientName: string) => void;
  title?: string;
  description?: string;
}

export function CSClientSelectorModal({ 
  open, 
  onOpenChange, 
  onSelect,
  title = "Selecionar Cliente",
  description = "Escolha o cliente para esta ação"
}: CSClientSelectorModalProps) {
  const [search, setSearch] = useState('');
  const { healthData, isLoading } = useCSHealthScore360();
  const { selectedSquadId } = useCSSquadFilter();

  // Filter by squad and search
  const filteredClients = useMemo(() => {
    let filtered = healthData;
    
    if (selectedSquadId) {
      filtered = filtered.filter(c => c.squadId === selectedSquadId);
    }
    
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(c => 
        c.clientName.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered.slice(0, 20); // Limit to 20 results
  }, [healthData, selectedSquadId, search]);

  const handleSelect = (client: typeof healthData[0]) => {
    onSelect(client.clientId, client.clientName);
    onOpenChange(false);
    setSearch('');
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
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse h-14 bg-muted/50 rounded-lg" />
                ))}
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhum cliente encontrado</p>
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
                      <AvatarImage src={client.clientAvatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {client.clientName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{client.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        Score: {client.healthScoreTotal}%
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={
                        client.churnRiskLevel === 'critical' ? 'text-red-600 border-red-200' :
                        client.churnRiskLevel === 'high' ? 'text-orange-600 border-orange-200' :
                        client.churnRiskLevel === 'medium' ? 'text-yellow-600 border-yellow-200' :
                        'text-green-600 border-green-200'
                      }
                    >
                      {client.churnRiskLevel === 'critical' ? 'Crítico' :
                       client.churnRiskLevel === 'high' ? 'Alto' :
                       client.churnRiskLevel === 'medium' ? 'Médio' : 'Baixo'}
                    </Badge>
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
