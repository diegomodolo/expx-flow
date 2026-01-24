import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { AudienceMultiSelect } from '@/components/campaigns/builder/AudienceMultiSelect';
import { InterestSelector, Interest } from '@/components/campaigns/builder/InterestSelector';
import { PixelSelector } from '@/components/campaigns/builder/PixelSelector';
import { ConversionEventSelector } from '@/components/campaigns/builder/ConversionEventSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdSetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: TreeNode | null;
  clientId: string;
  companyId?: string;
  onSuccess?: () => void;
}

export function AdSetEditModal({
  isOpen,
  onClose,
  node,
  clientId,
  companyId,
  onSuccess,
}: AdSetEditModalProps) {
  const [activeTab, setActiveTab] = useState('settings');
  const [isSaving, setIsSaving] = useState(false);
  
  // Basic fields
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'paused'>('active');
  const [editBudget, setEditBudget] = useState('');
  
  // Targeting fields
  const [includedAudiences, setIncludedAudiences] = useState<string[]>([]);
  const [excludedAudiences, setExcludedAudiences] = useState<string[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [genders, setGenders] = useState<number[]>([]);
  
  // Conversion fields
  const [pixelId, setPixelId] = useState('');
  const [conversionEvent, setConversionEvent] = useState('');

  const [hasChanges, setHasChanges] = useState(false);

  const { loading: inlineLoading, updateStatus, updateBudget, updateName } = useInlineEdit({
    onSuccess: () => {
      onSuccess?.();
    },
  });

  // Parse targeting from node
  const parseTargeting = useCallback((targeting: any) => {
    if (!targeting) return null;
    
    try {
      const data = typeof targeting === 'string' ? JSON.parse(targeting) : targeting;
      return data;
    } catch {
      return null;
    }
  }, []);

  // Reset form when node changes
  useEffect(() => {
    if (node && isOpen) {
      setEditName(node.name);
      setEditStatus(node.status === 'active' ? 'active' : 'paused');
      setEditBudget(node.budget?.amount?.toString() || '50');
      
      // Parse and set targeting
      const targeting = parseTargeting(node.targeting);
      if (targeting) {
        setAgeMin(targeting.age_min || 18);
        setAgeMax(targeting.age_max || 65);
        
        // Parse genders
        if (targeting.genders && targeting.genders.length > 0) {
          setGenders(targeting.genders);
        } else {
          setGenders([]);
        }
        
        // Parse interests
        if (targeting.flexible_spec) {
          const parsedInterests: Interest[] = [];
          targeting.flexible_spec.forEach((spec: any) => {
            if (spec.interests) {
              spec.interests.forEach((interest: any) => {
                parsedInterests.push({
                  id: interest.id,
                  name: interest.name,
                });
              });
            }
          });
          setInterests(parsedInterests);
        } else {
          setInterests([]);
        }
        
        // Parse custom audiences (these are stored as IDs)
        if (targeting.custom_audiences) {
          setIncludedAudiences(targeting.custom_audiences.map((a: any) => a.id || a));
        } else {
          setIncludedAudiences([]);
        }
        
        if (targeting.excluded_custom_audiences) {
          setExcludedAudiences(targeting.excluded_custom_audiences.map((a: any) => a.id || a));
        } else {
          setExcludedAudiences([]);
        }
      } else {
        setAgeMin(18);
        setAgeMax(65);
        setGenders([]);
        setInterests([]);
        setIncludedAudiences([]);
        setExcludedAudiences([]);
      }
      
      // Reset other fields
      setPixelId('');
      setConversionEvent('');
      setHasChanges(false);
      setActiveTab('settings');
    }
  }, [node?.id, isOpen, parseTargeting]);

  // Track changes
  useEffect(() => {
    if (!node) return;
    
    const nameChanged = editName !== node.name;
    const currentNodeStatus = node.status === 'active' ? 'active' : 'paused';
    const statusChanged = editStatus !== currentNodeStatus;
    const budgetChanged = node.budget && editBudget !== node.budget.amount.toString();
    
    // For now, always mark as changed if any targeting was modified
    // In a real implementation, you'd compare with original values
    setHasChanges(nameChanged || statusChanged || !!budgetChanged || true);
  }, [editName, editStatus, editBudget, includedAudiences, excludedAudiences, interests, ageMin, ageMax, genders, pixelId, conversionEvent, node]);

  const handleSave = useCallback(async () => {
    if (!clientId || !node) return;

    setIsSaving(true);
    const platform = node.platform as 'meta' | 'google';
    const facebookId = (node as any).facebookId;

    try {
      // For Meta, update targeting via edge function
      if (platform === 'meta' && facebookId) {
        const { data, error } = await supabase.functions.invoke('update-meta-adset', {
          body: {
            clientId,
            adSetId: node.id,
            facebookId,
            updates: {
              name: editName !== node.name ? editName : undefined,
              status: editStatus !== (node.status === 'active' ? 'active' : 'paused') 
                ? (editStatus === 'active' ? 'ACTIVE' : 'PAUSED') 
                : undefined,
              daily_budget: node.budget && editBudget !== node.budget.amount.toString() 
                ? parseFloat(editBudget) * 100 // Meta expects cents
                : undefined,
              targeting: {
                age_min: ageMin,
                age_max: ageMax,
                genders: genders.length > 0 ? genders : undefined,
                custom_audiences: includedAudiences.length > 0 
                  ? includedAudiences.map(id => ({ id })) 
                  : undefined,
                excluded_custom_audiences: excludedAudiences.length > 0 
                  ? excludedAudiences.map(id => ({ id })) 
                  : undefined,
                flexible_spec: interests.length > 0 
                  ? [{ interests: interests.map(i => ({ id: i.id, name: i.name })) }] 
                  : undefined,
                geo_locations: { countries: ['BR'] }, // Keep Brazil as default
              },
              pixel_id: pixelId || undefined,
              conversion_event: conversionEvent || undefined,
            },
          },
        });

        if (error) throw error;

        if (!data?.success) {
          throw new Error(data?.error || 'Erro ao atualizar conjunto de anúncios');
        }

        toast.success('Conjunto de anúncios atualizado com sucesso!');
      } else {
        // For Google or no Facebook ID, use inline edit for basic fields
        if (editName !== node.name) {
          await updateName('adset', node.id, clientId, facebookId, editName, platform);
        }
        if (editStatus !== (node.status === 'active' ? 'active' : 'paused')) {
          await updateStatus('adset', node.id, clientId, facebookId, editStatus, platform);
        }
        if (node.budget && editBudget !== node.budget.amount.toString()) {
          const newBudgetValue = parseFloat(editBudget);
          if (!isNaN(newBudgetValue) && newBudgetValue >= 1) {
            await updateBudget('adset', node.id, clientId, facebookId, newBudgetValue, node.budget.type, platform);
          }
        }
      }

      setHasChanges(false);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast.error(error.message || 'Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  }, [clientId, node, editName, editStatus, editBudget, ageMin, ageMax, genders, includedAudiences, excludedAudiences, interests, pixelId, conversionEvent, updateName, updateStatus, updateBudget, onSuccess, onClose]);

  if (!node || node.type !== 'adset') return null;

  const isGoogle = node.platform === 'google';
  const isLoading = isSaving || inlineLoading;
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;
  const formatNumber = (value: number) => value.toLocaleString();
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-primary" />
            <div className="flex-1">
              <DialogTitle className="text-xl">Editar Conjunto de Anúncios</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant={node.status === 'active' ? 'default' : 'secondary'}>
                  {node.status === 'active' ? 'Ativo' : 'Pausado'}
                </Badge>
                <Badge variant="outline">{node.platform.toUpperCase()}</Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-6">
            {/* Google Alert */}
            {isGoogle && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Google Ads: alterações serão salvas apenas localmente.
                </AlertDescription>
              </Alert>
            )}

            {/* Name Field */}
            <div className="space-y-2">
              <Label>Nome do Conjunto *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ex: Público Lookalike - 18-35"
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

            {/* Daily Budget */}
            <div className="space-y-2">
              <Label>Orçamento Diário (R$)</Label>
              <Input
                type="number"
                min={1}
                value={editBudget}
                onChange={(e) => setEditBudget(e.target.value)}
                placeholder="50"
              />
              {parseFloat(editBudget) < 1 && editBudget !== '' && (
                <p className="text-xs text-destructive">O orçamento mínimo é R$ 1,00</p>
              )}
            </div>

            {/* Targeting Section */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm">Segmentação</h4>

              {/* Included Audiences */}
              <AudienceMultiSelect
                clientId={clientId}
                selectedIds={includedAudiences}
                onChange={setIncludedAudiences}
                label="Públicos de Inclusão"
                placeholder="Selecionar públicos..."
              />

              {/* Excluded Audiences */}
              <AudienceMultiSelect
                clientId={clientId}
                selectedIds={excludedAudiences}
                onChange={setExcludedAudiences}
                label="Públicos de Exclusão"
                placeholder="Excluir públicos..."
              />

              {/* Interests */}
              <InterestSelector
                clientId={clientId}
                selectedInterests={interests}
                onChange={setInterests}
                label="Interesses"
                placeholder="Buscar interesses..."
              />
            </div>

            {/* Demographics Section */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm">Demografia</h4>

              {/* Age Range */}
              <div className="space-y-3">
                <Label>Faixa Etária: {ageMin} - {ageMax} anos</Label>
                <div className="px-2">
                  <Slider
                    min={18}
                    max={65}
                    step={1}
                    value={[ageMin, ageMax]}
                    onValueChange={([min, max]) => {
                      setAgeMin(min);
                      setAgeMax(max);
                    }}
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label>Gênero</Label>
                <Select
                  value={genders.length === 0 ? 'all' : genders[0].toString()}
                  onValueChange={(v) => {
                    if (v === 'all') {
                      setGenders([]);
                    } else {
                      setGenders([Number(v)]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="1">Masculino</SelectItem>
                    <SelectItem value="2">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conversion Section */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm">Conversão (opcional)</h4>

              <PixelSelector
                clientId={clientId}
                companyId={companyId || ''}
                value={pixelId}
                onChange={setPixelId}
              />

              <ConversionEventSelector
                value={conversionEvent}
                onChange={setConversionEvent}
                disabled={!pixelId}
                campaignObjective="OUTCOME_LEADS" // Show selector by default for editing
              />
            </div>

            {/* Metrics Summary */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Métricas Atuais
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Investido</p>
                  <p className="text-lg font-bold">{formatCurrency(node.metrics.spend)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Impressões</p>
                  <p className="text-lg font-bold">{formatNumber(node.metrics.impressions)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">CTR</p>
                  <p className="text-lg font-bold">{formatPercent(node.metrics.ctr)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Conversões</p>
                  <p className="text-lg font-bold">{formatNumber(node.metrics.conversions)}</p>
                </div>
              </div>
            </div>

            {/* Children Summary */}
            {node.children && node.children.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Anúncios neste Conjunto
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xl font-bold">{node.children.length}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xl font-bold text-primary">
                      {node.children.filter((c) => c.status === 'active').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Ativos</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xl font-bold text-muted-foreground">
                      {node.children.filter((c) => c.status === 'paused').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Pausados</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="p-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || editName.trim() === '' || parseFloat(editBudget) < 1}
          >
            {isLoading ? (
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
