import { useState, useMemo } from "react";
import { SearchableClientSelect } from "@/components/ui/searchable-client-select";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, GitBranch, Trash2, Loader2, Search, X } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useFunnels } from "@/hooks/useFunnels";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EditorFunil() {
  const navigate = useNavigate();
  const { clients, loading: loadingClients } = useClients();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState("");
  const [newFunnelDescription, setNewFunnelDescription] = useState("");
  const [newFunnelClientId, setNewFunnelClientId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClientId, setFilterClientId] = useState<string>("all");

  const { allFunnels, loadingAllFunnels, createFunnel, isCreating, deleteFunnel } = useFunnels();

  const filteredFunnels = useMemo(() => {
    if (!allFunnels) return [];
    
    return allFunnels.filter(funnel => {
      const matchesSearch = funnel.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClient = filterClientId === "all" || funnel.client_id === filterClientId;
      return matchesSearch && matchesClient;
    });
  }, [allFunnels, searchTerm, filterClientId]);

  const handleCreateFunnel = () => {
    if (newFunnelName.trim() && newFunnelClientId) {
      createFunnel(
        {
          client_id: newFunnelClientId,
          name: newFunnelName,
          description: newFunnelDescription || undefined,
        },
        {
          onSuccess: (data) => {
            setIsCreateDialogOpen(false);
            setNewFunnelName("");
            setNewFunnelDescription("");
            setNewFunnelClientId("");
            navigate(`/editor-funil/${newFunnelClientId}/${data.id}`);
          },
        }
      );
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterClientId("all");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Editor de Funil de Aquisição</h1>
            <p className="text-muted-foreground mt-2">
              Visualize e edite o funil completo de aquisição de leads dos seus clientes.
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Criar Novo Funil
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>
              Busque e filtre os funis de aquisição.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do funil..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="w-full md:w-[250px]">
                <SearchableClientSelect
                  clients={clients?.map(c => ({ id: c.id, name: c.name })) || []}
                  value={filterClientId}
                  onValueChange={setFilterClientId}
                  allLabel="Todos os clientes"
                  placeholder="Todos os clientes"
                />
              </div>
              {(searchTerm || filterClientId !== "all") && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Funnels Grid */}
        <div>
          {loadingAllFunnels ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            </div>
          ) : filteredFunnels && filteredFunnels.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredFunnels.map((funnel) => (
                <Card
                  key={funnel.id}
                  className="hover:border-primary cursor-pointer transition-colors"
                  onClick={() => navigate(`/editor-funil/${funnel.client_id}/${funnel.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <GitBranch className="h-8 w-8 text-primary" />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFunnel(funnel.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    {funnel.client && (
                      <Badge variant="secondary" className="w-fit mb-2">
                        {funnel.client.name}
                      </Badge>
                    )}
                    <CardTitle className="text-lg">{funnel.name}</CardTitle>
                    {funnel.description && (
                      <CardDescription className="line-clamp-2">
                        {funnel.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        Criado em{" "}
                        {format(new Date(funnel.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                      <p>
                        {funnel.flow_data.nodes?.length || 0} blocos
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || filterClientId !== "all" 
                  ? "Nenhum funil encontrado" 
                  : "Nenhum funil criado"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterClientId !== "all"
                  ? "Tente ajustar os filtros para encontrar o que procura."
                  : "Crie seu primeiro funil de aquisição para começar."}
              </p>
              {!(searchTerm || filterClientId !== "all") && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Funil
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Funnel Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Funil</DialogTitle>
            <DialogDescription>
              Selecione o cliente e configure o novo funil de aquisição.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="funnel-client">Cliente *</Label>
              {loadingClients ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </div>
              ) : (
                <SearchableClientSelect
                  clients={clients?.map(c => ({ id: c.id, name: c.name })) || []}
                  value={newFunnelClientId}
                  onValueChange={setNewFunnelClientId}
                  placeholder="Selecione o cliente"
                />
              )}
            </div>

            <div>
              <Label htmlFor="funnel-name">Nome do Funil *</Label>
              <Input
                id="funnel-name"
                value={newFunnelName}
                onChange={(e) => setNewFunnelName(e.target.value)}
                placeholder="Ex: Funil Outbound Agosto 2025"
              />
            </div>

            <div>
              <Label htmlFor="funnel-description">Descrição (opcional)</Label>
              <Textarea
                id="funnel-description"
                value={newFunnelDescription}
                onChange={(e) => setNewFunnelDescription(e.target.value)}
                placeholder="Adicione uma descrição para este funil"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewFunnelName("");
                setNewFunnelDescription("");
                setNewFunnelClientId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateFunnel}
              disabled={!newFunnelName.trim() || !newFunnelClientId || isCreating}
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar e Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
