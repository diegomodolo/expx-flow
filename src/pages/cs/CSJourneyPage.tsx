import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy } from 'lucide-react';
import { useCSHealthScore360 } from '@/hooks/useCSHealthScore360';
import { CSSuccessJourney } from '@/components/cs/CSSuccessJourney';

export default function CSJourneyPage() {
  const { healthData, isLoading } = useCSHealthScore360();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  const selectedClient = healthData.find(c => c.clientId === selectedClientId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Jornada da Vitória
        </h1>
        <p className="text-muted-foreground">
          Acompanhe o progresso dos clientes em direção ao sucesso
        </p>
      </div>

      {/* Journey Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Selecione um Cliente
            </span>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {healthData.map((client) => (
                  <SelectItem key={client.clientId} value={client.clientId}>
                    {client.clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse h-96 bg-muted/50 rounded-lg" />
          ) : !selectedClientId ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Selecione um cliente para ver a jornada</p>
            </div>
          ) : (
            <CSSuccessJourney 
              clientId={selectedClientId} 
              clientName={selectedClient?.clientName} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
