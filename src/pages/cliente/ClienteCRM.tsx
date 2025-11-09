import { useState } from "react";
import { useClientContext } from "./ClienteContext";
import { useCRMWorkspace } from "@/hooks/useCRMWorkspace";
import { useCRMLeads } from "@/hooks/useCRMLeads";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, ExternalLink, Power, PowerOff, Loader2, Users, TrendingUp } from "lucide-react";
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

export function ClienteCRM() {
  const { client } = useClientContext();
  const { toast } = useToast();
  const { workspace, isLoading, generateWorkspace, isGenerating, toggleActive, isTogglingActive } = useCRMWorkspace(client.id);
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false);
  
  // Para ClienteCRM, vamos buscar todos os leads independente do board (passando vazio)
  // Isso garante que as estatísticas mostrem todos os leads do workspace
  const { leads = [], stages = [] } = useCRMLeads(workspace?.id || '', '');

  const handleGenerateCRM = async () => {
    await generateWorkspace();
    setShowConfirmGenerate(false);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/crm/${workspace?.access_token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link de acesso foi copiado para a área de transferência.",
    });
  };

  const handleToggleActive = async () => {
    if (workspace) {
      await toggleActive(!workspace.is_active);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(l => {
    const stage = stages.find(s => s.id === l.stage_id);
    return stage?.event_mapping === 'LeadQualified' || stage?.event_mapping === 'MeetingScheduled' || stage?.event_mapping === 'ProposalSent';
  }).length;
  const sales = leads.filter(l => {
    const stage = stages.find(s => s.id === l.stage_id);
    return stage?.event_mapping === 'Purchase';
  }).length;
  const totalValue = leads
    .filter(l => {
      const stage = stages.find(s => s.id === l.stage_id);
      return stage?.event_mapping === 'Purchase';
    })
    .reduce((sum, l) => sum + (l.value || 0), 0);
  const conversionRate = totalLeads > 0 ? ((sales / totalLeads) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mini CRM do Cliente</CardTitle>
          <CardDescription>
            Gere um link de acesso para que o cliente gerencie seus leads diretamente.
            As conversões offline são enviadas automaticamente ao Meta quando os leads mudam de estágio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!workspace ? (
            <AlertDialog open={showConfirmGenerate} onOpenChange={setShowConfirmGenerate}>
              <AlertDialogTrigger asChild>
                <Button disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando CRM...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Gerar CRM para este Cliente
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Gerar Mini CRM?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Será criado um workspace CRM com kanban de leads para o cliente {client.name}.
                    Um link único de acesso será gerado e poderá ser compartilhado com o cliente.
                    <br /><br />
                    As seguintes colunas serão criadas automaticamente:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Lead Criado</li>
                      <li>Lead Qualificado (evento otimizável no Meta)</li>
                      <li>Reunião Agendada</li>
                      <li>Proposta Enviada</li>
                      <li>Compra Realizada (evento otimizável no Meta)</li>
                      <li>Lead Desqualificado (sinal negativo)</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleGenerateCRM}>
                    Confirmar e Gerar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Link de Acesso ao CRM</Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      value={`${window.location.origin}/crm/${workspace.access_token}`}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={handleCopyLink}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(`/crm/${workspace.access_token}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Compartilhe este link com o cliente para que ele acesse o CRM
                  </p>
                </div>

                <div>
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={workspace.is_active ? 'default' : 'secondary'}>
                      {workspace.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleActive}
                      disabled={isTogglingActive}
                    >
                      {isTogglingActive ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : workspace.is_active ? (
                        <PowerOff className="w-4 h-4 mr-2" />
                      ) : (
                        <Power className="w-4 h-4 mr-2" />
                      )}
                      {workspace.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="w-4 h-4" />
                      <p className="text-sm">Total de Leads</p>
                    </div>
                    <p className="text-2xl font-bold">{totalLeads}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <p className="text-sm">Leads Qualificados</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{qualifiedLeads}</p>
                    {totalLeads > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {((qualifiedLeads / totalLeads) * 100).toFixed(1)}% do total
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <p className="text-sm">Vendas Fechadas</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{sales}</p>
                    <p className="text-xs text-muted-foreground">
                      R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <p className="text-sm">Taxa de Conversão</p>
                    </div>
                    <p className="text-2xl font-bold">{conversionRate}%</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
