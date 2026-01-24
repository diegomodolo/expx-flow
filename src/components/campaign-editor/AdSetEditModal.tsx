import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Layers, 
  Save, 
  Settings, 
  TrendingUp, 
  DollarSign, 
  Eye, 
  MousePointer, 
  Target, 
  Users, 
  AlertTriangle 
} from 'lucide-react';
import { useInlineEdit } from '@/hooks/useInlineEdit';
import { TreeNode } from '@/hooks/useCampaignTree';

interface AdSetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: TreeNode | null;
  clientId: string;
  onSuccess?: () => void;
}

export function AdSetEditModal({
  isOpen,
  onClose,
  node,
  clientId,
  onSuccess,
}: AdSetEditModalProps) {
  const [activeTab, setActiveTab] = useState('settings');
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'paused'>('active');
  const [editBudget, setEditBudget] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const { loading, updateStatus, updateBudget, updateName } = useInlineEdit({
    onSuccess: () => {
      onSuccess?.();
      setHasChanges(false);
    },
  });

  // Reset form when node changes
  useEffect(() => {
    if (node && isOpen) {
      setEditName(node.name);
      setEditStatus(node.status === 'active' ? 'active' : 'paused');
      setEditBudget(node.budget?.amount?.toString() || '');
      setHasChanges(false);
      setActiveTab('settings');
    }
  }, [node?.id, isOpen]);

  // Track changes
  useEffect(() => {
    if (!node) return;
    const nameChanged = editName !== node.name;
    const currentNodeStatus = node.status === 'active' ? 'active' : 'paused';
    const statusChanged = editStatus !== currentNodeStatus;
    const budgetChanged = node.budget && editBudget !== node.budget.amount.toString();
    setHasChanges(nameChanged || statusChanged || !!budgetChanged);
  }, [editName, editStatus, editBudget, node]);

  const handleSave = useCallback(async () => {
    if (!clientId || !node) return;

    const platform = node.platform as 'meta' | 'google';
    const facebookId = (node as any).facebookId;

    try {
      // Update name if changed
      if (editName !== node.name) {
        await updateName('adset', node.id, clientId, facebookId, editName, platform);
      }

      // Update status if changed
      const currentNodeStatus = node.status === 'active' ? 'active' : 'paused';
      if (editStatus !== currentNodeStatus) {
        await updateStatus('adset', node.id, clientId, facebookId, editStatus, platform);
      }

      // Update budget if changed
      if (node.budget && editBudget !== node.budget.amount.toString()) {
        const newBudgetValue = parseFloat(editBudget);
        if (!isNaN(newBudgetValue) && newBudgetValue >= 1) {
          await updateBudget(
            'adset',
            node.id,
            clientId,
            facebookId,
            newBudgetValue,
            node.budget.type,
            platform
          );
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  }, [clientId, node, editName, editStatus, editBudget, updateName, updateStatus, updateBudget, onClose]);

  if (!node || node.type !== 'adset') return null;

  const isGoogle = node.platform === 'google';
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;
  const formatNumber = (value: number) => value.toLocaleString();
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  // Parse targeting for display
  const getTargetingDisplay = () => {
    if (!node.targeting) return null;
    
    try {
      const targeting = typeof node.targeting === 'string' 
        ? JSON.parse(node.targeting) 
        : node.targeting;
      
      const items = [];
      
      if (targeting.age_min || targeting.age_max) {
        items.push(`Idade: ${targeting.age_min || 18} - ${targeting.age_max || 65} anos`);
      }
      
      if (targeting.geo_locations?.countries) {
        items.push(`Países: ${targeting.geo_locations.countries.join(', ')}`);
      }
      
      if (targeting.flexible_spec) {
        const interests = targeting.flexible_spec
          .flatMap((spec: any) => spec.interests || [])
          .map((i: any) => i.name)
          .slice(0, 5);
        if (interests.length > 0) {
          items.push(`Interesses: ${interests.join(', ')}${interests.length >= 5 ? '...' : ''}`);
        }
      }
      
      return items;
    } catch {
      return null;
    }
  };

  const targetingItems = getTargetingDisplay();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-primary" />
            <div className="flex-1">
              <DialogTitle className="text-xl">{node.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant={node.status === 'active' ? 'default' : 'secondary'}>
                  {node.status === 'active' ? 'Ativo' : 'Pausado'}
                </Badge>
                <Badge variant="outline">{node.platform.toUpperCase()}</Badge>
                <span className="text-xs">Conjunto de Anúncios</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="w-4 h-4" />
                Configurações
                {hasChanges && <span className="w-2 h-2 rounded-full bg-primary" />}
              </TabsTrigger>
              <TabsTrigger value="metrics" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Métricas
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6">
            {/* Settings Tab */}
            <TabsContent value="settings" className="m-0 py-6 space-y-6">
              {/* Google Alert */}
              {isGoogle && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Google Ads: alterações serão salvas apenas localmente (sem API).
                  </AlertDescription>
                </Alert>
              )}

              {/* Basic Settings */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nome do Conjunto</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nome do conjunto de anúncios"
                    />
                    {editName.trim() === '' && (
                      <p className="text-xs text-destructive">O nome não pode estar vazio</p>
                    )}
                  </div>

                  {/* Status Field */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {editStatus === 'active' ? 'Ativo' : 'Pausado'}
                        </span>
                        <Badge variant={editStatus === 'active' ? 'default' : 'secondary'}>
                          {editStatus === 'active' ? 'ON' : 'OFF'}
                        </Badge>
                      </div>
                      <Switch
                        checked={editStatus === 'active'}
                        onCheckedChange={(checked) => setEditStatus(checked ? 'active' : 'paused')}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Budget Settings */}
              {node.budget && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Orçamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-budget">
                        Orçamento {node.budget.type === 'daily' ? 'Diário' : 'Vitalício'}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          R$
                        </span>
                        <Input
                          id="edit-budget"
                          type="number"
                          min="1"
                          step="0.01"
                          value={editBudget}
                          onChange={(e) => setEditBudget(e.target.value)}
                          className="pl-10"
                          placeholder="0.00"
                        />
                      </div>
                      {parseFloat(editBudget) < 1 && editBudget !== '' && (
                        <p className="text-xs text-destructive">O orçamento mínimo é R$ 1,00</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Gasto até agora</p>
                        <p className="text-lg font-semibold">{formatCurrency(node.budget.spent)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Utilizado</p>
                        <p className="text-lg font-semibold">
                          {((node.budget.spent / node.budget.amount) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Targeting Info (Read-only) */}
              {targetingItems && targetingItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Segmentação
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {targetingItems.map((item, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground">
                          {item}
                        </p>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      * Edição de segmentação disponível apenas na criação de novos conjuntos.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Children Summary */}
              {node.children && node.children.length > 0 && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Anúncios neste Conjunto
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{node.children.length}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold text-primary">
                          {node.children.filter((c) => c.status === 'active').length}
                        </p>
                        <p className="text-xs text-muted-foreground">Ativos</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold text-muted-foreground">
                          {node.children.filter((c) => c.status === 'paused').length}
                        </p>
                        <p className="text-xs text-muted-foreground">Pausados</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="m-0 py-6 space-y-6">
              {/* Investment Metrics */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Indicadores de Investimento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Investimento Total</p>
                      <p className="text-2xl font-bold">{formatCurrency(node.metrics.spend)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">CPA</p>
                      <p className="text-2xl font-bold">{formatCurrency(node.metrics.cpa)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">CPC</p>
                      <p className="text-2xl font-bold">{formatCurrency(node.metrics.cpc)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Metrics */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Indicadores de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Impressões</p>
                      <p className="text-xl font-bold">{formatNumber(node.metrics.impressions)}</p>
                    </div>
                    {node.metrics.reach !== undefined && (
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Alcance</p>
                        <p className="text-xl font-bold">{formatNumber(node.metrics.reach)}</p>
                      </div>
                    )}
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Cliques</p>
                      <p className="text-xl font-bold">{formatNumber(node.metrics.clicks)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Conversões</p>
                      <p className="text-xl font-bold">{formatNumber(node.metrics.conversions)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Indicadores de Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">CTR</p>
                      <p className="text-2xl font-bold">{formatPercent(node.metrics.ctr)}</p>
                      <p className="text-xs text-muted-foreground">Taxa de cliques</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Taxa de Conversão</p>
                      <p className="text-2xl font-bold">
                        {node.metrics.clicks > 0 
                          ? formatPercent((node.metrics.conversions / node.metrics.clicks) * 100)
                          : '0.00%'}
                      </p>
                      <p className="text-xs text-muted-foreground">Conversões ÷ Cliques</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <Separator />

        <DialogFooter className="p-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Fechar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || loading || editName.trim() === '' || (node.budget && parseFloat(editBudget) < 1)}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
