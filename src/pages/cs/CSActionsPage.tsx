import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  Phone, 
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { useCSHealthScore360 } from '@/hooks/useCSHealthScore360';
import { CSNPSTracker } from '@/components/cs/CSNPSTracker';
import { CSTouchpointLog } from '@/components/cs/CSTouchpointLog';
import { CSQBRList } from '@/components/cs/CSQBRList';
import { CSValueStatementList } from '@/components/cs/CSValueStatementList';
import { CSNewTouchpointModal } from '@/components/cs/CSNewTouchpointModal';
import { useCSSquadFilter } from '@/contexts/CSSquadFilterContext';

export default function CSActionsPage() {
  const { healthData } = useCSHealthScore360();
  const { selectedSquadId } = useCSSquadFilter();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [showNewTouchpoint, setShowNewTouchpoint] = useState(false);
  
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          Ações de CS
        </h1>
        <p className="text-muted-foreground">
          Touchpoints, NPS, QBR e Value Statements
        </p>
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
                    onClick={() => {
                      setSelectedClientId(client.clientId);
                      setShowNewTouchpoint(true);
                    }}
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

      {/* New Touchpoint Modal */}
      {selectedClientId && (
        <CSNewTouchpointModal
          open={showNewTouchpoint}
          onOpenChange={setShowNewTouchpoint}
          clientId={selectedClientId}
          clientName={selectedClient?.clientName}
        />
      )}
    </div>
  );
}
