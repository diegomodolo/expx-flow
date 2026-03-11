import React, { useState } from "react";
import { Plus, Bot, Search, Filter, X, Check, Edit, Copy, Trash2, User, MoreVertical, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useIAAgents } from "@/hooks/useIAAgents";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClients } from "@/hooks/useClients";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AgentesIA() {
  const { agents, deleteAgent, duplicateAgent } = useIAAgents();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { hasPermission } = useEmployeePermissions();
  const [clientFilter, setClientFilter] = useState<string>("all");
  const { clients = [] } = useClients();

  const filteredAgents = agents
    .filter((agent) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        agent.agent_name.toLowerCase().includes(searchLower) ||
        (agent.description && agent.description.toLowerCase().includes(searchLower)) ||
        (agent.client?.name && agent.client.name.toLowerCase().includes(searchLower));

      const matchesClient =
        clientFilter === "all" ||
        (clientFilter === "none" && !agent.client_id) ||
        agent.client_id === clientFilter;

      return matchesSearch && matchesClient;
    })
    .sort((a, b) => a.agent_name.localeCompare(b.agent_name));

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Bot className="text-primary text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agentes de Inteligência Artificial</h1>
              <p className="text-muted-foreground">Crie e gerencie seus assistentes de IA personalizados</p>
            </div>
          </div>
          {hasPermission('editar-agentes') && (
            <Button onClick={() => navigate('/ia/agents/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo Agente
            </Button>
          )}
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar agente..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              <SelectItem value="none">Sem cliente</SelectItem>
              {clients
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {(clientFilter !== "all" || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setClientFilter("all");
                setSearchTerm("");
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {filteredAgents.length} agente{filteredAgents.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {agents.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum agente criado</h3>
            <p className="text-muted-foreground mb-4">Crie seu primeiro agente de IA para começar</p>
            {hasPermission('editar-agentes') && (
              <Button onClick={() => navigate('/ia/agents/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Agente
              </Button>
            )}
          </div>
        ) : (
          <Card className="border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Agente</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Colaborador</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      Nenhum agente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAgents.map((agent) => (
                    <TableRow
                      key={agent.id}
                      className="border-border cursor-pointer"
                      onClick={() => navigate(`/ia/agents/${agent.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground text-sm truncate">{agent.agent_name}</div>
                            {agent.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-[300px]">{agent.description}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {agent.client ? (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <User className="w-3 h-3" />
                            {agent.client.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {(agent as unknown).is_collaborator ? (
                          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-0 text-xs gap-1">
                            <UserCheck className="w-3 h-3" />
                            Sim
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {(agent as unknown).model?.split('/').pop() || 'gemini-2.5-flash'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {hasPermission('editar-agentes') && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button aria-label="Editar"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => navigate(`/ia/agents/${agent.id}/edit`)}
                                  >
                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button aria-label="Fechar"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => duplicateAgent(agent.id)}
                                  >
                                    <Copy className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Duplicar</TooltipContent>
                              </Tooltip>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button aria-label="Excluir"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. Todas as conversas associadas também serão excluídas.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteAgent(agent.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
