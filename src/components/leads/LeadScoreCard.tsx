import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award, Building2, UserCheck, ShieldCheck, Target, Monitor } from "lucide-react";
import { LeadQualificationBadge } from "./LeadQualificationBadge";

type LeadClassification = 'ouro' | 'prata' | 'bronze' | 'descartado' | null;

interface DimensionScores {
  company_fit: number;
  authority: number;
  contact_quality: number;
  purchase_intent: number;
  digital_maturity: number;
}

interface LeadScoreCardProps {
  globalScore: number;
  classification: LeadClassification;
  dimensionScores: DimensionScores;
  reason?: string;
  compact?: boolean;
}

const dimensionConfig = [
  { key: 'company_fit', label: 'Perfil de Empresa', icon: Building2, color: 'text-blue-500' },
  { key: 'authority', label: 'Autoridade', icon: UserCheck, color: 'text-purple-500' },
  { key: 'contact_quality', label: 'Qualidade do Contato', icon: ShieldCheck, color: 'text-green-500' },
  { key: 'purchase_intent', label: 'Intenção de Compra', icon: Target, color: 'text-red-500' },
  { key: 'digital_maturity', label: 'Maturidade Digital', icon: Monitor, color: 'text-cyan-500' },
] as const;

function getProgressColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function LeadScoreCard({
  globalScore,
  classification,
  dimensionScores,
  reason,
  compact = false,
}: LeadScoreCardProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <LeadQualificationBadge 
          classification={classification} 
          score={globalScore}
          showScore
          reason={reason}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Score de Qualificação</CardTitle>
          <LeadQualificationBadge 
            classification={classification}
            score={globalScore}
            showScore
            size="lg"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dimension Scores */}
        <div className="space-y-3">
          {dimensionConfig.map(({ key, label, icon: Icon, color }) => {
            const score = dimensionScores[key as keyof DimensionScores];
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", color)} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                  <span className="font-medium">{score}</span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      getProgressColor(score)
                    )}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Reason */}
        {reason && (
          <div className="pt-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">ℹ️ </span>
              {reason}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
