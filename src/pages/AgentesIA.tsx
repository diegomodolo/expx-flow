import React, { useState } from "react";
import { Plus, Bot, Search, Filter, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useIAAgents } from "@/hooks/useIAAgents";
import { AgentCard } from "@/components/agents/AgentCard";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useClients } from "@/hooks/useClients";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function AgentesIA() {
  const { agents } = useIAAgents();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { hasPermission } = useEmployeePermissions();
  const [showFilters, setShowFilters] = useState(false);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [openClientCombo, setOpenClientCombo] = useState(false);
  const { clients } = useClients();

  // Filtrar e ordenar agentes
  const filteredAgents = agents
    .filter((agent) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        agent.agent_name.toLowerCase().includes(searchLower) ||
        (agent.description && agent.description.toLowerCase().includes(searchLower)) ||
        (agent.client?.name && agent.client.name.toLowerCase().includes(searchLower)) ||
        (agent.client?.company && agent.client.company.toLowerCase().includes(searchLower));
      
      const matchesClient = 
        clientFilter === "all" || 
        (clientFilter === "none" && !agent.client_id) ||
        agent.client_id === clientFilter;
      
      return matchesSearch && matchesClient;
    })
    .sort((a, b) => a.agent_name.localeCompare(b.agent_name));

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Bot className="w-8 h-8" />
                Agentes de Inteligência Artificial
              </h1>
              <p className="text-muted-foreground mt-1">
                Crie e gerencie seus assistentes de IA personalizados
              </p>
            </div>
            {agents.length > 0 && (
              <Badge variant="secondary" className="px-3 py-1 text-sm">
                {filteredAgents.length} {filteredAgents.length === 1 ? 'agente' : 'agentes'}
              </Badge>
            )}
          </div>
          {hasPermission('editar-agentes') && (
            <Button onClick={() => navigate('/ia/agents/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo Agente
            </Button>
          )}
        </div>

        {/* Filters Card */}
        {agents.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Primeira linha: Campo de busca e botões */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  {/* Search Input */}
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Buscar agentes por nome, descrição ou cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                      />
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex items-center space-x-2" 
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="w-4 h-4" />
                      <span>Filtros</span>
                    </Button>
                    {(clientFilter !== "all" || searchTerm) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setClientFilter("all");
                          setSearchTerm("");
                        }}
                        className="flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Segunda linha: Filtro rápido de cliente (sempre visível) */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium whitespace-nowrap">Cliente:</span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={clientFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setClientFilter("all")}
                    >
                      Todos
                    </Button>
                    <Button
                      variant={clientFilter === "none" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setClientFilter("none")}
                    >
                      Sem Cliente
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advanced Filters Card */}
        {showFilters && agents.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-4">Filtros Avançados</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Selecionar Cliente Específico</Label>
                  <Popover open={openClientCombo} onOpenChange={setOpenClientCombo}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openClientCombo}
                        className="w-full justify-between"
                      >
                        {clientFilter === "all" 
                          ? "Todos os clientes" 
                          : clientFilter === "none"
                          ? "Sem cliente"
                          : clients.find((client) => client.id === clientFilter)?.name || "Selecione um cliente"}
                        <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." className="h-9" />
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-auto">
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setClientFilter("all");
                              setOpenClientCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                clientFilter === "all" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Todos os clientes
                          </CommandItem>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setClientFilter("none");
                              setOpenClientCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                clientFilter === "none" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Sem cliente
                          </CommandItem>
                          {clients
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.name} ${client.company}`}
                                onSelect={() => {
                                  setClientFilter(client.id);
                                  setOpenClientCombo(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    clientFilter === client.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{client.name}</span>
                                  <span className="text-xs text-muted-foreground">{client.company}</span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grid de Cards */}
        {agents.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum agente criado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro agente de IA para começar
            </p>
            {hasPermission('editar-agentes') && (
              <Button onClick={() => navigate('/ia/agents/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Agente
              </Button>
            )}
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum agente encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar os termos da sua busca
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredAgents.map((agent, index) => (
              <AgentCard key={agent.id} agent={agent} index={index} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
