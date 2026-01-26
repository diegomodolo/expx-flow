import { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2,
  Rocket,
  X,
} from 'lucide-react';
import { useCampaignBuilder } from '@/hooks/useCampaignBuilder';
import { CampaignSection } from './builder/CampaignSection';
import { AdSetSection } from './builder/AdSetSection';
import { ReviewSection } from './builder/ReviewSection';
import { AIGeneratorSection, AIGeneratedData } from './builder/AIGeneratorSection';
import { BuilderTreeNav } from './builder/BuilderTreeNav';
import { CreativeEditor } from './builder/CreativeEditor';

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
    setSelectedCreativeIndex,
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

  const currentAdSet = state.adSets[state.currentAdSetIndex];
  const validationError = validateAll();

  // Determine what content to show based on state
  const renderContent = () => {
    if (state.currentSection === 'ai-generator') {
      return (
        <AIGeneratorSection
          clientId={clientId}
          companyId={companyId}
          onGenerated={handleAIGenerated}
          onNavigateToSection={setCurrentSection}
        />
      );
    }

    if (state.currentSection === 'campaign') {
      return (
        <CampaignSection
          campaign={state.campaign}
          onChange={updateCampaign}
        />
      );
    }

    if (state.currentSection === 'adsets' && currentAdSet) {
      // If a creative is selected, show only the creative editor
      if (state.selectedCreativeIndex !== undefined) {
        const creative = currentAdSet.creatives[state.selectedCreativeIndex];
        if (creative) {
          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">
                  {creative.title || `Criativo ${state.selectedCreativeIndex + 1}`}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Conjunto: {currentAdSet.name || `Conjunto ${state.currentAdSetIndex + 1}`}
                </p>
              </div>
              <CreativeEditor
                creative={creative}
                onChange={(updates) => updateCreative(state.currentAdSetIndex, state.selectedCreativeIndex!, updates)}
                clientId={clientId}
                clientName={clientName}
              />
            </div>
          );
        }
      }

      // Show ad set section
      return (
        <AdSetSection
          adSet={currentAdSet}
          clientId={clientId}
          companyId={companyId}
          campaignObjective={state.campaign.objective}
          clientName={clientName}
          onChange={(updates) => updateAdSet(state.currentAdSetIndex, updates)}
          onAddCreative={() => addCreative(state.currentAdSetIndex)}
          onRemoveCreative={(index) => removeCreative(state.currentAdSetIndex, index)}
          onUpdateCreative={(index, updates) => 
            updateCreative(state.currentAdSetIndex, index, updates)
          }
        />
      );
    }

    if (state.currentSection === 'review') {
      return (
        <ReviewSection
          state={state}
          validationError={validationError}
        />
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="w-[1800px] max-w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        hideCloseButton
      >
        <div className="flex h-full">
          {/* Left sidebar - Tree navigation */}
          <div className="w-[450px] min-w-[450px] border-r bg-muted/30 flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h1 className="text-base font-semibold">Nova Campanha</h1>
                <p className="text-xs text-muted-foreground">
                  {clientName}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tree Navigation */}
            <BuilderTreeNav
              state={state}
              onSelectSection={setCurrentSection}
              onSelectAdSet={setCurrentAdSetIndex}
              onSelectCreative={setSelectedCreativeIndex}
              onAddAdSet={addAdSet}
              onRemoveAdSet={removeAdSet}
              onAddCreative={addCreative}
              onRemoveCreative={removeCreative}
              validateCampaign={validateCampaign}
            />

            {/* Sidebar Footer */}
            <div className="flex-shrink-0 p-4 border-t">
              <Button
                className="w-full"
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
              {validationError && (
                <p className="text-xs text-destructive mt-2 text-center">
                  {validationError}
                </p>
              )}
            </div>
          </div>

          {/* Right content area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-6 max-w-4xl">
                {renderContent()}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
