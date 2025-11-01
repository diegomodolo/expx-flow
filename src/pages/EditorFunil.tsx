import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, GitBranch, Trash2, Loader2 } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useFunnels } from "@/hooks/useFunnels";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EditorFunil() {
  const navigate = useNavigate();
  const { clients, loading: loadingClients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState("");
  const [newFunnelDescription, setNewFunnelDescription] = useState("");

  const { funnels, loadingFunnels, createFunnel, isCreating, deleteFunnel } = useFunnels(selectedClientId);

  const handleCreateFunnel = () => {
    if (newFunnelName.trim() && selectedClientId) {
      createFunnel(
        {
          client_id: selectedClientId,
          name: newFunnelName,
          description: newFunnelDescription || undefined,
        },
        {
          onSuccess: (data) => {
            setIsCreateDialogOpen(false);
            setNewFunnelName("");
            setNewFunnelDescription("");
            navigate(`/editor-funil/${selectedClientId}/${data.id}`);
          },
        }
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Editor de Funil de Aquisição</h1>
          <p className="text-muted-foreground mt-2">
            Visualize e edite o funil completo de aquisição de leads dos seus clientes.
          </p>
        </div>

        {/* Client Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Selecione o Cliente</CardTitle>
            <CardDescription>
              Escolha o cliente para visualizar ou criar funis de aquisição.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingClients ? (
                      <div className="p-4 text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </div>
                    ) : (
                      clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={!selectedClientId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo Funil
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Funnels List */}
        {selectedClientId && (
          <Card>
            <CardHeader>
              <CardTitle>Funis Salvos</CardTitle>
              <CardDescription>
                Gerencie os funis de aquisição deste cliente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFunnels ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                </div>
              ) : funnels && funnels.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {funnels.map((funnel) => (
                    <Card
                      key={funnel.id}
                      className="hover:border-primary cursor-pointer transition-colors"
                      onClick={() => navigate(`/editor-funil/${selectedClientId}/${funnel.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
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
                        <CardTitle className="text-lg">{funnel.name}</CardTitle>
                        {funnel.description && (
                          <CardDescription className="line-clamp-2">
                            {funnel.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">
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
                  <h3 className="text-lg font-medium mb-2">Nenhum funil criado</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie seu primeiro funil de aquisição para este cliente.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Funil
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Funnel Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Funil</DialogTitle>
            <DialogDescription>
              Dê um nome ao funil e adicione uma descrição opcional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateFunnel}
              disabled={!newFunnelName.trim() || isCreating}
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
