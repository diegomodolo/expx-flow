import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Clock, PartyPopper, Play, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { CSCelebrationModal } from "./CSCelebrationModal";
import { ClientMilestone } from "@/hooks/useClientMilestones";

interface CSMilestoneCardProps {
  milestone: ClientMilestone;
  onComplete: () => void;
  onCelebrate: (method: 'whatsapp' | 'email' | 'both') => void;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pendente',
    color: 'bg-muted text-muted-foreground',
    borderColor: 'border-muted',
  },
  in_progress: {
    icon: Play,
    label: 'Em Andamento',
    color: 'bg-blue-500/10 text-blue-500',
    borderColor: 'border-blue-500/30',
  },
  completed: {
    icon: Check,
    label: 'Concluído',
    color: 'bg-green-500/10 text-green-500',
    borderColor: 'border-green-500/30',
  },
  celebrated: {
    icon: PartyPopper,
    label: 'Celebrado!',
    color: 'bg-primary/10 text-primary',
    borderColor: 'border-primary/30',
  },
};

const milestoneTypeLabels: Record<string, string> = {
  onboarding: 'Onboarding',
  first_campaign: 'Primeira Campanha',
  first_lead: 'Primeiro Lead',
  monthly_goal: 'Meta Mensal',
  quarterly_goal: 'Meta Trimestral',
  custom: 'Personalizado',
};

export function CSMilestoneCard({ milestone, onComplete, onCelebrate }: CSMilestoneCardProps) {
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  
  const config = statusConfig[milestone.status] || statusConfig.pending;
  const StatusIcon = config.icon;
  const isCompleted = milestone.status === 'completed' || milestone.status === 'celebrated';
  const canCelebrate = milestone.status === 'completed' && !milestone.celebrationSent;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-4 p-4 rounded-lg border-2 transition-all",
          config.borderColor,
          isCompleted && "bg-muted/30"
        )}
      >
        {/* Status Icon */}
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
            config.color
          )}
        >
          <StatusIcon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn("font-medium", isCompleted && "line-through opacity-70")}>
              {milestone.title}
            </h4>
            <Badge variant="outline" className="text-xs">
              {milestoneTypeLabels[milestone.milestoneType] || milestone.milestoneType}
            </Badge>
          </div>
          {milestone.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {milestone.description}
            </p>
          )}
          {milestone.completedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Concluído em {new Date(milestone.completedAt).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {milestone.status === 'pending' && (
            <Button size="sm" variant="outline" onClick={onComplete}>
              <Check className="h-4 w-4 mr-1" />
              Validar
            </Button>
          )}
          {milestone.status === 'in_progress' && (
            <Button size="sm" onClick={onComplete}>
              <Check className="h-4 w-4 mr-1" />
              Concluir
            </Button>
          )}
          {canCelebrate && (
            <Button 
              size="sm" 
              variant="default"
              onClick={() => setShowCelebrationModal(true)}
            >
              <Send className="h-4 w-4 mr-1" />
              Celebrar
            </Button>
          )}
          {milestone.celebrationSent && (
            <Badge className="bg-primary/10 text-primary border-primary/30">
              <PartyPopper className="h-3 w-3 mr-1" />
              Celebrado
            </Badge>
          )}
        </div>
      </div>

      {/* Celebration Modal */}
      <CSCelebrationModal
        open={showCelebrationModal}
        onOpenChange={setShowCelebrationModal}
        milestone={milestone}
        onSend={(method) => {
          onCelebrate(method);
          setShowCelebrationModal(false);
        }}
      />
    </>
  );
}
