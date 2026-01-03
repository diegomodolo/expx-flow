import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Campaign {
  id: string;
  name: string;
  facebook_id: string | null;
}

interface AdSet {
  id: string;
  name: string;
  facebook_id: string;
  campaign_id: string;
}

interface SelectedDestination {
  campaignId: string;
  campaignName: string;
  adSetIds: string[];
}

interface ApprovalDestinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adId: string;
  clientId: string;
  companyId: string;
  defaultCampaignId?: string | null;
  defaultAdSetId?: string | null;
  onApprove: (destinations: SelectedDestination[]) => Promise<void>;
  adContent?: {
    headline?: string;
    image_url?: string;
  };
}

export function ApprovalDestinationDialog({
  open,
  onOpenChange,
  adId,
  clientId,
  companyId,
  defaultCampaignId,
  defaultAdSetId,
  onApprove,
  adContent,
}: ApprovalDestinationDialogProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adSetsByCampaign, setAdSetsByCampaign] = useState<Record<string, AdSet[]>>({});
  const [selectedDestinations, setSelectedDestinations] = useState<SelectedDestination[]>([]);
  const [expandedCampaigns, setExpandedCampaigns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (open && clientId) {
      loadData();
    }
  }, [open, clientId]);

  useEffect(() => {
    // Set default selections when data is loaded
    if (defaultCampaignId && campaigns.length > 0) {
      const campaign = campaigns.find(c => c.id === defaultCampaignId);
      if (campaign) {
        const adSets = adSetsByCampaign[defaultCampaignId] || [];
        const defaultAdSets = defaultAdSetId 
          ? adSets.filter(a => a.id === defaultAdSetId).map(a => a.id)
          : [];
        
        setSelectedDestinations([{
          campaignId: defaultCampaignId,
          campaignName: campaign.name,
          adSetIds: defaultAdSets,
        }]);
        setExpandedCampaigns([defaultCampaignId]);
      }
    }
  }, [defaultCampaignId, defaultAdSetId, campaigns, adSetsByCampaign]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name, facebook_id')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('name');

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Load all ad sets for all campaigns
      const { data: adSetsData, error: adSetsError } = await supabase
        .from('ad_sets')
        .select('id, name, facebook_id, campaign_id')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('name');

      if (adSetsError) throw adSetsError;

      // Group ad sets by campaign
      const grouped: Record<string, AdSet[]> = {};
      (adSetsData || []).forEach(adSet => {
        if (!grouped[adSet.campaign_id]) {
          grouped[adSet.campaign_id] = [];
        }
        grouped[adSet.campaign_id].push(adSet);
      });
      setAdSetsByCampaign(grouped);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaign = (campaignId: string, campaignName: string) => {
    setSelectedDestinations(prev => {
      const existing = prev.find(d => d.campaignId === campaignId);
      if (existing) {
        return prev.filter(d => d.campaignId !== campaignId);
      }
      return [...prev, { campaignId, campaignName, adSetIds: [] }];
    });
  };

  const toggleAdSet = (campaignId: string, campaignName: string, adSetId: string) => {
    setSelectedDestinations(prev => {
      const existingIdx = prev.findIndex(d => d.campaignId === campaignId);
      
      if (existingIdx === -1) {
        // Campaign not selected yet, add it with this ad set
        return [...prev, { campaignId, campaignName, adSetIds: [adSetId] }];
      }
      
      const existing = prev[existingIdx];
      const hasAdSet = existing.adSetIds.includes(adSetId);
      
      const newAdSetIds = hasAdSet
        ? existing.adSetIds.filter(id => id !== adSetId)
        : [...existing.adSetIds, adSetId];
      
      const updated = [...prev];
      updated[existingIdx] = { ...existing, adSetIds: newAdSetIds };
      return updated;
    });
  };

  const toggleExpandCampaign = (campaignId: string) => {
    setExpandedCampaigns(prev => 
      prev.includes(campaignId) 
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const isCampaignSelected = (campaignId: string) => {
    return selectedDestinations.some(d => d.campaignId === campaignId);
  };

  const isAdSetSelected = (campaignId: string, adSetId: string) => {
    const dest = selectedDestinations.find(d => d.campaignId === campaignId);
    return dest?.adSetIds.includes(adSetId) || false;
  };

  const getSelectedCount = () => {
    return selectedDestinations.reduce((acc, d) => acc + Math.max(d.adSetIds.length, 1), 0);
  };

  const handlePublish = async () => {
    const destinationsWithAdSets = selectedDestinations.filter(d => d.adSetIds.length > 0);
    
    if (destinationsWithAdSets.length === 0) {
      toast.error('Selecione pelo menos uma campanha e um conjunto de anúncios');
      return;
    }

    setPublishing(true);
    try {
      await onApprove(destinationsWithAdSets);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error publishing:', error);
      toast.error('Erro ao publicar: ' + error.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Aprovar e Publicar Anúncio
          </DialogTitle>
          <DialogDescription>
            Selecione as campanhas e conjuntos de anúncios onde este criativo será publicado no Facebook
          </DialogDescription>
        </DialogHeader>

        {/* Ad Preview Mini */}
        {adContent?.headline && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
            {adContent.image_url && (
              <img 
                src={adContent.image_url} 
                alt="Preview" 
                className="w-16 h-16 object-cover rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{adContent.headline}</p>
              <p className="text-sm text-muted-foreground">Será publicado com status Ativo</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhuma campanha ativa encontrada.</p>
              <p className="text-sm text-muted-foreground">Sincronize os dados do Meta primeiro.</p>
            </div>
          ) : (
            campaigns.map(campaign => {
              const adSets = adSetsByCampaign[campaign.id] || [];
              const isExpanded = expandedCampaigns.includes(campaign.id);
              const isSelected = isCampaignSelected(campaign.id);
              const selectedAdSetCount = selectedDestinations.find(d => d.campaignId === campaign.id)?.adSetIds.length || 0;

              return (
                <div 
                  key={campaign.id} 
                  className={cn(
                    "border rounded-lg overflow-hidden transition-colors",
                    isSelected && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3 p-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCampaign(campaign.id, campaign.name)}
                    />
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpandCampaign(campaign.id)} className="flex-1">
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium flex-1">{campaign.name}</span>
                        {selectedAdSetCount > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {selectedAdSetCount} conjunto{selectedAdSetCount !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {adSets.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {adSets.length} conjunto{adSets.length !== 1 ? 's' : ''} disponível{adSets.length !== 1 ? 'is' : ''}
                          </span>
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {adSets.length > 0 ? (
                          <div className="mt-2 ml-6 space-y-1">
                            {adSets.map(adSet => (
                              <div 
                                key={adSet.id} 
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer",
                                  isAdSetSelected(campaign.id, adSet.id) && "bg-primary/10"
                                )}
                                onClick={() => toggleAdSet(campaign.id, campaign.name, adSet.id)}
                              >
                                <Checkbox
                                  checked={isAdSetSelected(campaign.id, adSet.id)}
                                  onCheckedChange={() => toggleAdSet(campaign.id, campaign.name, adSet.id)}
                                />
                                <span className="text-sm">{adSet.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 ml-6 text-sm text-muted-foreground italic">
                            Nenhum conjunto de anúncios nesta campanha
                          </p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {getSelectedCount() > 0 ? (
                <span>
                  Publicar em <strong>{getSelectedCount()}</strong> destino{getSelectedCount() !== 1 ? 's' : ''}
                </span>
              ) : (
                <span>Selecione os destinos de publicação</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handlePublish} 
                disabled={publishing || selectedDestinations.filter(d => d.adSetIds.length > 0).length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Aprovar e Publicar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
