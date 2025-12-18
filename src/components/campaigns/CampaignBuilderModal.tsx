import { useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Target, 
  Users, 
  FileCheck, 
  Plus, 
  Trash2, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Rocket,
  X,
  Sparkles
} from 'lucide-react';
import { useCampaignBuilder } from '@/hooks/useCampaignBuilder';
import { CampaignSection } from './builder/CampaignSection';
import { AdSetSection } from './builder/AdSetSection';
import { ReviewSection } from './builder/ReviewSection';
import { AIGeneratorSection, AIGeneratedData } from './builder/AIGeneratorSection';
import { cn } from '@/lib/utils';

interface CampaignBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  companyId: string;
  clientName: string;
  onSuccess?: () => void;
}

export function CampaignBuilderModal({
  isOpen,
  onClose,
  clientId,
  companyId,
  clientName,
  onSuccess,
}: CampaignBuilderModalProps) {
  const {
    state,
    resetState,
    updateCampaign,
    setCurrentSection,
    setCurrentAdSetIndex,
    addAdSet,
    removeAdSet,
    updateAdSet,
    addCreative,
    removeCreative,
    updateCreative,
    validateCampaign,
    validateAll,
    submitCampaign,
    applyAIGeneratedData,
  } = useCampaignBuilder(clientId);

  const handleAIGenerated = (data: AIGeneratedData) => {
    applyAIGeneratedData({
      campaign: data.campaign,
      adSets: data.adSets,
    });
  };

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    const success = await submitCampaign();
    if (success) {
      onSuccess?.();
      onClose();
    }
  };

  const canGoNext = useMemo(() => {
    if (state.currentSection === 'ai-generator') return false;
    if (state.currentSection === 'campaign') {
      return !validateCampaign();
    }
    return true;
  }, [state.currentSection, validateCampaign]);

  const handleNext = () => {
    if (state.currentSection === 'ai-generator') {
      setCurrentSection('campaign');
    } else if (state.currentSection === 'campaign') {
      setCurrentSection('adsets');
    } else if (state.currentSection === 'adsets') {
      setCurrentSection('review');
    }
  };

  const handleBack = () => {
    if (state.currentSection === 'review') {
      setCurrentSection('adsets');
    } else if (state.currentSection === 'adsets') {
      setCurrentSection('campaign');
    } else if (state.currentSection === 'campaign') {
      setCurrentSection('ai-generator');
    }
  };

  const currentAdSet = state.adSets[state.currentAdSetIndex];
  const validationError = validateAll();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div>
            <h1 className="text-lg font-semibold">Nova Campanha no Meta</h1>
            <p className="text-sm text-muted-foreground">
              Cliente: {clientName}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r bg-muted/20 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-1">
                {/* AI Generator Section */}
                <button
                  onClick={() => setCurrentSection('ai-generator')}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                    state.currentSection === 'ai-generator'
                      ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground'
                      : 'hover:bg-muted border border-dashed border-primary/30 text-primary'
                  )}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>Gerar com IA</span>
                </button>

                <div className="py-2">
                  <Separator />
                </div>

                {/* Campaign Section */}
                <button
                  onClick={() => setCurrentSection('campaign')}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                    state.currentSection === 'campaign'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <Target className="h-4 w-4 shrink-0" />
                  <span>Campanha</span>
                  {!validateCampaign() && state.campaign.name && (
                    <span className="ml-auto text-green-500">✓</span>
                  )}
                </button>

                {/* Ad Sets Section */}
                <div className="pt-2">
                  <button
                    onClick={() => setCurrentSection('adsets')}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                      state.currentSection === 'adsets'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Users className="h-4 w-4 shrink-0" />
                    <span>Conjuntos ({state.adSets.length})</span>
                  </button>

                  {/* Ad Set List */}
                  {state.currentSection === 'adsets' && (
                    <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                      {state.adSets.map((adSet, index) => (
                        <div
                          key={adSet.id}
                          className={cn(
                            'flex items-center gap-2 group',
                          )}
                        >
                          <button
                            onClick={() => setCurrentAdSetIndex(index)}
                            className={cn(
                              'flex-1 text-left px-2 py-1.5 rounded text-sm transition-colors truncate',
                              state.currentAdSetIndex === index
                                ? 'bg-muted font-medium'
                                : 'hover:bg-muted/50 text-muted-foreground'
                            )}
                          >
                            {adSet.name || `Conjunto ${index + 1}`}
                          </button>
                          {state.adSets.length > 1 && (
                            <button
                              onClick={() => removeAdSet(index)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded transition-all"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={addAdSet}
                        className="flex items-center gap-1 px-2 py-1.5 text-sm text-primary hover:bg-primary/10 rounded w-full"
                      >
                        <Plus className="h-3 w-3" />
                        Novo Conjunto
                      </button>
                    </div>
                  )}
                </div>

                {/* Review Section */}
                <div className="pt-2">
                  <button
                    onClick={() => setCurrentSection('review')}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                      state.currentSection === 'review'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <FileCheck className="h-4 w-4 shrink-0" />
                    <span>Revisão</span>
                  </button>
                </div>
              </div>
            </ScrollArea>

            {/* Sidebar Footer */}
            <div className="p-4 border-t">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>📍 {state.adSets.length} conjunto(s)</p>
                <p>🎨 {state.adSets.reduce((s, a) => s + a.creatives.length, 0)} criativo(s)</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-6 max-w-3xl">
                {state.currentSection === 'ai-generator' && (
                  <AIGeneratorSection
                    clientId={clientId}
                    companyId={companyId}
                    onGenerated={handleAIGenerated}
                    onNavigateToSection={setCurrentSection}
                  />
                )}

                {state.currentSection === 'campaign' && (
                  <CampaignSection
                    campaign={state.campaign}
                    onChange={updateCampaign}
                  />
                )}

                {state.currentSection === 'adsets' && currentAdSet && (
                  <AdSetSection
                    adSet={currentAdSet}
                    clientId={clientId}
                    companyId={companyId}
                    campaignObjective={state.campaign.objective}
                    onChange={(updates) => updateAdSet(state.currentAdSetIndex, updates)}
                    onAddCreative={() => addCreative(state.currentAdSetIndex)}
                    onRemoveCreative={(index) => removeCreative(state.currentAdSetIndex, index)}
                    onUpdateCreative={(index, updates) => 
                      updateCreative(state.currentAdSetIndex, index, updates)
                    }
                  />
                )}

                {state.currentSection === 'review' && (
                  <ReviewSection
                    state={state}
                    validationError={validationError}
                  />
                )}
              </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={state.currentSection === 'campaign'}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>

                {state.currentSection === 'review' ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!!validationError || state.isSubmitting}
                  >
                    {state.isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Publicando...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Publicar no Meta
                      </>
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleNext} disabled={!canGoNext}>
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
