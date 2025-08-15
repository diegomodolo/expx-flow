import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClients } from "@/hooks/useClients";
import { Building2, Palette, Target, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientSelectorForCreativesProps {
  selectedClientId: string;
  onClientSelect: (clientId: string) => void;
}

export function ClientSelectorForCreatives({ 
  selectedClientId, 
  onClientSelect 
}: ClientSelectorForCreativesProps) {
  const { clients, loading } = useClients();

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Selecione o Cliente</h3>
          <p className="text-muted-foreground">
            Escolha o cliente para carregar o briefing e diretrizes visuais
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const clientsWithBriefing = clients?.filter(client => client.ai_briefing) || [];
  const clientsWithoutBriefing = clients?.filter(client => !client.ai_briefing) || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Selecione o Cliente</h3>
        <p className="text-muted-foreground">
          Escolha o cliente para carregar o briefing e diretrizes visuais
        </p>
      </div>

      {clientsWithBriefing.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h4 className="font-medium">Clientes com Briefing Completo</h4>
            <Badge variant="secondary">{clientsWithBriefing.length}</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientsWithBriefing.map((client) => (
              <Card
                key={client.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                  selectedClientId === client.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => onClientSelect(client.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {client.avatar ? (
                        <img 
                          src={client.avatar} 
                          alt={client.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{client.name}</h4>
                        {selectedClientId === client.id && (
                          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2 truncate">
                        {client.company}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                          {client.sector}
                        </Badge>
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          <Palette className="w-3 h-3 mr-1" />
                          Briefing IA
                        </Badge>
                      </div>
                      
                      {client.target_audience && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Target className="w-3 h-3" />
                          <span className="truncate">{client.target_audience}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {clientsWithoutBriefing.length > 0 && (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-muted-foreground">Clientes sem Briefing Completo</h4>
            <p className="text-sm text-muted-foreground">
              Estes clientes precisam de um briefing completo para gerar criativos de qualidade
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientsWithoutBriefing.map((client) => (
              <Card
                key={client.id}
                className="opacity-60 border-dashed"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {client.avatar ? (
                        <img 
                          src={client.avatar} 
                          alt={client.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{client.name}</h4>
                      <p className="text-xs text-muted-foreground mb-2 truncate">
                        {client.company}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                          {client.sector}
                        </Badge>
                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                          Sem Briefing
                        </Badge>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2 text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/clientes/${client.id}`, '_blank');
                        }}
                      >
                        Completar Briefing
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedClientId && (
        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span className="font-medium">
              Cliente selecionado: {clients?.find(c => c.id === selectedClientId)?.name}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Briefing e diretrizes carregados com sucesso
          </p>
        </div>
      )}

      {(!clients || clients.length === 0) && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Você precisa ter pelo menos um cliente cadastrado para gerar criativos.
              </p>
              <Button onClick={() => window.open('/clientes', '_blank')}>
                Cadastrar Cliente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}