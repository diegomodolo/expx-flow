import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  Layers, 
  ImageIcon,
  ChevronRight,
  Sparkles,
  FileCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import { CampaignBuilderState, AdSetData } from '@/hooks/useCampaignBuilder';

type Section = CampaignBuilderState['currentSection'];

interface BuilderTreeNavProps {
  state: CampaignBuilderState;
  onSelectSection: (section: Section) => void;
  onSelectAdSet: (index: number) => void;
  onSelectCreative: (adSetIndex: number, creativeIndex: number) => void;
  onAddAdSet: () => void;
  onRemoveAdSet: (index: number) => void;
  onAddCreative: (adSetIndex: number) => void;
  onRemoveCreative: (adSetIndex: number, creativeIndex: number) => void;
  validateCampaign: () => string | null;
}

interface TreeNodeItemProps {
  id: string;
  name: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
  level: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  badge?: React.ReactNode;
  onRemove?: () => void;
  canRemove?: boolean;
}

function TreeNodeItem({
  id,
  name,
  icon,
  isSelected,
  onClick,
  level,
  hasChildren,
  isExpanded,
  onToggleExpand,
  badge,
  onRemove,
  canRemove = false,
}: TreeNodeItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors group",
        isSelected
          ? "bg-primary/10 ring-2 ring-primary ring-inset"
          : "hover:bg-muted/50",
      )}
      style={{ paddingLeft: `${level * 16 + 12}px` }}
      onClick={onClick}
    >
      {/* Expand/Collapse button */}
      {hasChildren ? (
        <button
          className="p-0.5 hover:bg-muted rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand?.();
          }}
        >
          <ChevronRight
            className={cn(
              "w-4 h-4 transition-transform text-muted-foreground",
              isExpanded && "rotate-90"
            )}
          />
        </button>
      ) : (
        <div className="w-5" />
      )}

      {/* Icon */}
      <span className="text-muted-foreground flex-shrink-0">
        {icon}
      </span>

      {/* Name */}
      <span
        className="flex-1 truncate text-xs font-medium"
        title={name}
      >
        {name}
      </span>

      {/* Badge */}
      {badge}

      {/* Remove button */}
      {canRemove && onRemove && (
        <button
          className="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function BuilderTreeNav({
  state,
  onSelectSection,
  onSelectAdSet,
  onSelectCreative,
  onAddAdSet,
  onRemoveAdSet,
  onAddCreative,
  onRemoveCreative,
  validateCampaign,
}: BuilderTreeNavProps) {
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(() => {
    // Initialize with all ad sets expanded
    return new Set(state.adSets.map(as => as.id));
  });

  const toggleAdSetExpand = (adSetId: string) => {
    setExpandedAdSets(prev => {
      const next = new Set(prev);
      if (next.has(adSetId)) {
        next.delete(adSetId);
      } else {
        next.add(adSetId);
      }
      return next;
    });
  };

  const totalCreatives = state.adSets.reduce((sum, as) => sum + as.creatives.length, 0);

  const isValid = !validateCampaign() && state.campaign.name;

  return (
    <div className="flex flex-col h-full">
      {/* Header with summary */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm mb-2">Estrutura da Campanha</h3>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>{state.adSets.length} conjunto(s)</span>
          <span>•</span>
          <span>{totalCreatives} criativo(s)</span>
        </div>
      </div>

      {/* Tree navigation */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {/* AI Generator Section */}
          <TreeNodeItem
            id="ai-generator"
            name="Gerar com IA"
            icon={<Sparkles className="w-4 h-4" />}
            isSelected={state.currentSection === 'ai-generator'}
            onClick={() => onSelectSection('ai-generator')}
            level={0}
            badge={
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary border-primary/30">
                Opcional
              </Badge>
            }
          />

          <div className="my-2 mx-4 border-t" />

          {/* Campaign Section */}
          <TreeNodeItem
            id="campaign"
            name={state.campaign.name || 'Nova Campanha'}
            icon={<Target className="w-4 h-4" />}
            isSelected={state.currentSection === 'campaign' && state.selectedCreativeIndex === undefined}
            onClick={() => onSelectSection('campaign')}
            level={0}
            hasChildren={state.adSets.length > 0}
            isExpanded={true}
            badge={
              isValid ? (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  ✓
                </Badge>
              ) : state.campaign.name ? (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                  ...
                </Badge>
              ) : null
            }
          />

          {/* Ad Sets */}
          {state.adSets.map((adSet, adSetIndex) => {
            const isAdSetExpanded = expandedAdSets.has(adSet.id);
            const hasCreatives = adSet.creatives.length > 0;

            return (
              <div key={adSet.id}>
                <TreeNodeItem
                  id={adSet.id}
                  name={adSet.name || `Conjunto ${adSetIndex + 1}`}
                  icon={<Layers className="w-4 h-4" />}
                  isSelected={state.currentSection === 'adsets' && state.currentAdSetIndex === adSetIndex && state.selectedCreativeIndex === undefined}
                  onClick={() => onSelectAdSet(adSetIndex)}
                  level={1}
                  hasChildren={hasCreatives}
                  isExpanded={isAdSetExpanded}
                  onToggleExpand={() => toggleAdSetExpand(adSet.id)}
                  canRemove={state.adSets.length > 1}
                  onRemove={() => onRemoveAdSet(adSetIndex)}
                />

                {/* Creatives */}
                {isAdSetExpanded && adSet.creatives.map((creative, creativeIndex) => (
                  <TreeNodeItem
                    key={creative.id}
                    id={creative.id}
                    name={creative.title || `Criativo ${creativeIndex + 1}`}
                    icon={<ImageIcon className="w-4 h-4" />}
                    isSelected={
                      state.currentSection === 'adsets' && 
                      state.currentAdSetIndex === adSetIndex && 
                      state.selectedCreativeIndex === creativeIndex
                    }
                    onClick={() => onSelectCreative(adSetIndex, creativeIndex)}
                    level={2}
                    canRemove={adSet.creatives.length > 1}
                    onRemove={() => onRemoveCreative(adSetIndex, creativeIndex)}
                  />
                ))}

                {/* Add Creative Button */}
                {isAdSetExpanded && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-primary"
                    style={{ paddingLeft: `${2 * 16 + 12}px` }}
                    onClick={() => onAddCreative(adSetIndex)}
                  >
                    <div className="w-5" />
                    <Plus className="w-3 h-3" />
                    <span className="text-xs">Novo Criativo</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Ad Set Button */}
          <div
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-primary"
            style={{ paddingLeft: `${1 * 16 + 12}px` }}
            onClick={onAddAdSet}
          >
            <div className="w-5" />
            <Plus className="w-3 h-3" />
            <span className="text-xs">Novo Conjunto</span>
          </div>

          <div className="my-2 mx-4 border-t" />

          {/* Review Section */}
          <TreeNodeItem
            id="review"
            name="Revisão Final"
            icon={<FileCheck className="w-4 h-4" />}
            isSelected={state.currentSection === 'review'}
            onClick={() => onSelectSection('review')}
            level={0}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
