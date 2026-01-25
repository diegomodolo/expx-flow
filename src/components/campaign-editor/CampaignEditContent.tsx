import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Target, 
  Save, 
  Settings, 
  DollarSign, 
  Eye, 
  Percent,
  Layers,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { TreeNode } from '@/hooks/useCampaignTree';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CampaignEditContentProps {
  node: TreeNode;
  clientId: string;
  companyId?: string;
  onSuccess?: () => void;
}

const OBJECTIVE_LABELS: Record<string, string> = {
  CONVERSIONS: 'Conversões',
  OUTCOME_SALES: 'Vendas',
  OUTCOME_LEADS: 'Geração de Leads',
  OUTCOME_ENGAGEMENT: 'Engajamento',
  OUTCOME_AWARENESS: 'Reconhecimento',
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_APP_PROMOTION: 'Promoção de App',
  TRAFFIC: 'Tráfego',
  LEAD_GENERATION: 'Geração de Leads',
  MESSAGES: 'Mensagens',
  ENGAGEMENT: 'Engajamento',
  APP_INSTALLS: 'Instalações de App',
  VIDEO_VIEWS: 'Visualizações de Vídeo',
  REACH: 'Alcance',
  BRAND_AWARENESS: 'Reconhecimento de Marca',
  LINK_CLICKS: 'Cliques no Link',
  POST_ENGAGEMENT: 'Engajamento com Publicação',
  PAGE_LIKES: 'Curtidas na Página',
};

export function CampaignEditContent({
  node,
  clientId,
  companyId,
  onSuccess,
}: CampaignEditContentProps) {
  const [isSaving, setIsSaving] = useState(false);
  
  // Basic fields
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'paused'>('active');
  const [budgetType, setBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [editBudget, setEditBudget] = useState('');
  
  const [hasChanges, setHasChanges] = useState(false);

  // Reset form when node changes
  useEffect(() => {
    if (node) {
      setEditName(node.name);
      setEditStatus(node.status === 'active' ? 'active' : 'paused');
      setBudgetType(node.budget?.type || 'daily');
      setEditBudget(node.budget?.amount?.toString() || '');
      setHasChanges(false);
    }
  }, [node?.id]);

  // Track changes
  useEffect(() => {
    if (!node) return;
    
    const nameChanged = editName !== node.name;
    const currentNodeStatus = node.status === 'active' ? 'active' : 'paused';
    const statusChanged = editStatus !== currentNodeStatus;
    const budgetTypeChanged = budgetType !== (node.budget?.type || 'daily');
    const budgetValueChanged = node.budget && editBudget !== node.budget.amount.toString();
    
    setHasChanges(nameChanged || statusChanged || budgetTypeChanged || !!budgetValueChanged);
  }, [editName, editStatus, budgetType, editBudget, node]);

  const handleSave = useCallback(async () => {
    if (!clientId || !node) return;

    setIsSaving(true);

    try {
      const currentNodeStatus = node.status === 'active' ? 'active' : 'paused';
      const nameChanged = editName !== node.name;
      const statusChanged = editStatus !== currentNodeStatus;
      const budgetChanged = node.budget && (
        editBudget !== node.budget.amount.toString() || 
        budgetType !== node.budget.type
      );

      // Update name
      if (nameChanged) {
        const { data, error } = await supabase.functions.invoke('manage-facebook-campaign', {
          body: {
            campaignId: node.id,
            clientId,
            action: 'rename',
            name: editName,
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erro ao renomear campanha');
      }

      // Update status
      if (statusChanged) {
        const { data, error } = await supabase.functions.invoke('manage-facebook-campaign', {
          body: {
            campaignId: node.id,
            clientId,
            action: 'toggle',
            status: editStatus === 'active' ? 'ACTIVE' : 'PAUSED',
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erro ao alterar status');
      }

      // Update budget
      if (budgetChanged && editBudget) {
        const { data, error } = await supabase.functions.invoke('manage-facebook-campaign', {
          body: {
            campaignId: node.id,
            clientId,
            action: 'budget',
            budgetType,
            amount: parseFloat(editBudget) * 100, // Meta expects cents
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erro ao atualizar orçamento');
      }

      toast.success('Campanha atualizada com sucesso!');
      setHasChanges(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      toast.error(error.message || 'Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  }, [clientId, node, editName, editStatus, budgetType, editBudget, onSuccess]);

  // Calculate ad sets summary
  const adSetsSummary = useMemo(() => {
    if (!node?.children) return { total: 0, active: 0, paused: 0 };
    
    return {
      total: node.children.length,
      active: node.children.filter(c => c.status === 'active').length,
      paused: node.children.filter(c => c.status !== 'active').length,
    };
  }, [node?.children]);

  if (!node || node.type !== 'campaign') return null;

  const isGoogle = node.platform === 'google';
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;
  const formatNumber = (value: number) => value.toLocaleString();
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  const objectiveLabel = OBJECTIVE_LABELS[(node as any).objective || ''] || (node as any).objective || 'Não definido';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Campanha</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{node.platform.toUpperCase()}</Badge>
            </div>
          </div>
          {/* Status Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {editStatus === 'active' ? 'Ativo' : 'Pausado'}
            </span>
            <Switch
              checked={editStatus === 'active'}
              onCheckedChange={(checked) => setEditStatus(checked ? 'active' : 'paused')}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Google Alert */}
          {isGoogle && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Google Ads: alterações serão salvas apenas localmente.
              </AlertDescription>
            </Alert>
          )}

          {/* Metrics Cards at Top */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <DollarSign className="w-3 h-3" />
                <span className="text-xs">Investido</span>
              </div>
              <p className="text-sm font-bold">{formatCurrency(node.metrics.spend)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Eye className="w-3 h-3" />
                <span className="text-xs">Impressões</span>
              </div>
              <p className="text-sm font-bold">{formatNumber(node.metrics.impressions)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Percent className="w-3 h-3" />
                <span className="text-xs">CTR</span>
              </div>
              <p className="text-sm font-bold">{formatPercent(node.metrics.ctr)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Target className="w-3 h-3" />
                <span className="text-xs">Conversões</span>
              </div>
              <p className="text-sm font-bold">{formatNumber(node.metrics.conversions)}</p>
            </div>
            {/* Ad Sets Summary */}
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Layers className="w-3 h-3" />
                <span className="text-xs">Conjuntos</span>
              </div>
              <p className="text-sm font-bold">{adSetsSummary.total}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <PlayCircle className="w-3 h-3" />
                <span className="text-xs">Ativos</span>
              </div>
              <p className="text-sm font-bold text-primary">{adSetsSummary.active}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <PauseCircle className="w-3 h-3" />
                <span className="text-xs">Pausados</span>
              </div>
              <p className="text-sm font-bold text-muted-foreground">{adSetsSummary.paused}</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Configurations */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <Settings className="w-4 h-4" />
                  Configurações
                </h4>

                {/* Name Field */}
                <div className="space-y-2">
                  <Label>Nome da Campanha *</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Ex: Campanha de Conversões - Janeiro"
                  />
                  {editName.trim() === '' && (
                    <p className="text-xs text-destructive">O nome não pode estar vazio</p>
                  )}
                </div>

                {/* Objective (Read-only) */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Objetivo
                    <Badge variant="secondary" className="text-xs font-normal">
                      <Info className="w-3 h-3 mr-1" />
                      Somente leitura
                    </Badge>
                  </Label>
                  <Input
                    value={objectiveLabel}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    O objetivo não pode ser alterado após a criação da campanha.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Budget */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <DollarSign className="w-4 h-4" />
                  Orçamento
                </h4>

                {/* Budget Type */}
                <div className="space-y-2">
                  <Label>Tipo de Orçamento</Label>
                  <Select value={budgetType} onValueChange={(v) => setBudgetType(v as 'daily' | 'lifetime')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="lifetime">Vitalício</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Budget Value */}
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    placeholder="50"
                  />
                  {editBudget !== '' && parseFloat(editBudget) < 1 && (
                    <p className="text-xs text-destructive">O orçamento mínimo é R$ 1,00</p>
                  )}
                </div>

                {/* Budget Summary */}
                {node.budget?.spent !== undefined && (
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gasto até agora:</span>
                      <span className="font-medium">{formatCurrency(node.budget.spent)}</span>
                    </div>
                    {node.budget.amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Restante:</span>
                        <span className="font-medium">
                          {formatCurrency(Math.max(0, node.budget.amount - node.budget.spent))}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="p-4 flex justify-end gap-2">
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges || editName.trim() === ''}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
