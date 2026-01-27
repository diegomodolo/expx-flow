import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  Phone, 
  TrendingUp,
  ArrowUpRight,
  Plus,
  Star,
  MessageCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCSHealthScore360 } from '@/hooks/useCSHealthScore360';
import { CSNPSTracker } from '@/components/cs/CSNPSTracker';
import { CSTouchpointLog } from '@/components/cs/CSTouchpointLog';
import { CSQBRList } from '@/components/cs/CSQBRList';
import { CSValueStatementList } from '@/components/cs/CSValueStatementList';
import { CSNewTouchpointModal } from '@/components/cs/CSNewTouchpointModal';
import { CSClientSelectorModal } from '@/components/cs/CSClientSelectorModal';
import { CSNPSCollectModal } from '@/components/cs/CSNPSCollectModal';
import { useCSSquadFilter } from '@/contexts/CSSquadFilterContext';
import { CSSquadFilter } from '@/components/cs/CSSquadFilter';

type ActionType = 'touchpoint' | 'nps' | null;

export default function CSActionsPage() {
  const { healthData } = useCSHealthScore360();
  const { selectedSquadId } = useCSSquadFilter();
  
  // State for modals
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [showTouchpointModal, setShowTouchpointModal] = useState(false);
  const [showNPSModal, setShowNPSModal] = useState(false);
  
  // Filtrar por squad se selecionado
  const filteredHealthData = useMemo(() => {
    if (!selectedSquadId) return healthData;
    return healthData.filter(c => c.squadId === selectedSquadId);
  }, [healthData, selectedSquadId]);
  
  const selectedClient = filteredHealthData.find(c => c.clientId === selectedClientId);

  const pendingContacts = filteredHealthData.filter(c => {
    if (!c.lastCsContactAt) return true;
    const days = Math.floor((Date.now() - new Date(c.lastCsContactAt).getTime()) / (1000 * 60 * 60 * 24));
    return days > 7;
  });

  const upsellOpportunities = filteredHealthData.filter(c => 
    c.churnRiskLevel === 'low' && c.healthScoreTotal >= 80
  );

  // Handle action from dropdown
  const handleNewAction = (type: ActionType) => {
    setActionType(type);
    setShowClientSelector(true);
  };

  // Handle client selection
  const handleClientSelect = (clientId: string, clientName: string) => {
    setSelectedClientId(clientId);
    setSelectedClientName(clientName);
    setShowClientSelector(false);
    
    // Open the appropriate modal
    if (actionType === 'touchpoint') {
      setShowTouchpointModal(true);
    } else if (actionType === 'nps') {
      setShowNPSModal(true);
    }
  };

  // Quick register from pending contacts
  const handleQuickTouchpoint = (clientId: string, clientName: string) => {
    setSelectedClientId(clientId);
    setSelectedClientName(clientName);
    setShowTouchpointModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with action buttons */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Ações de CS
          </h1>
          <p className="text-muted-foreground">
            Touchpoints, NPS, QBR e Value Statements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CSSquadFilter />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Ação
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleNewAction('touchpoint')}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Novo Touchpoint
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNewAction('nps')}>
                <Star className="h-4 w-4 mr-2" />
                Coletar NPS
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contatos Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingContacts.slice(0, 5).map((client) => (
                <div key={client.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{client.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.lastCsContactAt 
                        ? `Último contato: ${Math.floor((Date.now() - new Date(client.lastCsContactAt).getTime()) / (1000 * 60 * 60 * 24))} dias atrás`
                        : 'Nunca contactado'
                      }
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleQuickTouchpoint(client.clientId, client.clientName)}
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Registrar
                  </Button>
                </div>
              ))}
              {pendingContacts.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Todos os clientes foram contactados recentemente! 🎉
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Oportunidades de Upsell
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upsellOpportunities.slice(0, 5).map((client) => (
                <div key={client.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{client.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      Score: {client.healthScoreTotal}% | {client.activeCampaigns} campanhas
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    Expandir
                  </Button>
                </div>
              ))}
              {upsellOpportunities.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma oportunidade identificada no momento
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NPS & Touchpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CSNPSTracker />
        <CSTouchpointLog limit={5} />
      </div>

      {/* QBR & Value Statements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CSQBRList />
        <CSValueStatementList />
      </div>

      {/* Client Selector Modal */}
      <CSClientSelectorModal
        open={showClientSelector}
        onOpenChange={setShowClientSelector}
        onSelect={handleClientSelect}
        title={actionType === 'touchpoint' ? 'Selecionar Cliente para Touchpoint' : 'Selecionar Cliente para NPS'}
        description={actionType === 'touchpoint' 
          ? 'Escolha o cliente para registrar um novo touchpoint' 
          : 'Escolha o cliente para coletar o NPS'
        }
      />

      {/* Touchpoint Modal */}
      <CSNewTouchpointModal
        open={showTouchpointModal}
        onOpenChange={setShowTouchpointModal}
        clientId={selectedClientId}
        clientName={selectedClientName}
      />

      {/* NPS Collection Modal */}
      <CSNPSCollectModal
        open={showNPSModal}
        onOpenChange={setShowNPSModal}
        clientId={selectedClientId}
        clientName={selectedClientName}
      />
    </div>
  );
}
