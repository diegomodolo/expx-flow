import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientMilestones, ClientMilestone } from "@/hooks/useClientMilestones";
import { CSMilestoneCard } from "./CSMilestoneCard";
import { Progress } from "@/components/ui/progress";
import { Trophy, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CSSuccessJourneyProps {
  clientId: string;
  clientName?: string;
}

export function CSSuccessJourney({ clientId, clientName }: CSSuccessJourneyProps) {
  const { milestones, isLoading, completeMilestone, celebrateMilestone } = useClientMilestones(clientId);

  const completedCount = milestones.filter(m => m.status === 'completed' || m.status === 'celebrated').length;
  const totalCount = milestones.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Group milestones by type
  const onboardingMilestones = milestones.filter(m => m.milestoneType === 'onboarding');
  const performanceMilestones = milestones.filter(m => 
    ['first_campaign', 'first_lead', 'monthly_goal', 'quarterly_goal'].includes(m.milestoneType)
  );
  const customMilestones = milestones.filter(m => m.milestoneType === 'custom');

  const handleComplete = (milestone: ClientMilestone) => {
    completeMilestone.mutate({ milestoneId: milestone.id });
  };

  const handleCelebrate = (milestone: ClientMilestone, method: 'whatsapp' | 'email' | 'both' = 'whatsapp') => {
    celebrateMilestone.mutate({ milestoneId: milestone.id, method });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Jornada da Vitória
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Jornada da Vitória
            {clientName && <span className="text-muted-foreground font-normal text-sm">- {clientName}</span>}
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            {completedCount}/{totalCount} conquistas
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso Geral</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        {/* Onboarding Section */}
        {onboardingMilestones.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              🚀 Onboarding
            </h4>
            <div className="space-y-2">
              {onboardingMilestones.map((milestone) => (
                <CSMilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  onComplete={() => handleComplete(milestone)}
                  onCelebrate={(method) => handleCelebrate(milestone, method)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Performance Section */}
        {performanceMilestones.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              📈 Marcos de Performance
            </h4>
            <div className="space-y-2">
              {performanceMilestones.map((milestone) => (
                <CSMilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  onComplete={() => handleComplete(milestone)}
                  onCelebrate={(method) => handleCelebrate(milestone, method)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Custom Section */}
        {customMilestones.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              🎯 Metas Personalizadas
            </h4>
            <div className="space-y-2">
              {customMilestones.map((milestone) => (
                <CSMilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  onComplete={() => handleComplete(milestone)}
                  onCelebrate={(method) => handleCelebrate(milestone, method)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {milestones.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum milestone definido ainda</p>
            <p className="text-sm">Configure os marcos de sucesso para este cliente</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
