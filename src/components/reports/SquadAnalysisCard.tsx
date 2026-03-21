import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
} from "lucide-react";

export interface SquadAnalysis {
  id: string;
  name: string;
  description: string;
  icon: string;
  icon_bg: string;
  icon_color: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  productivity: number;
  avgProgress: number;
  status: "excellent" | "good" | "needs_attention" | "critical";
  issues: string[];
  recommendations: string[];
  workloadLevel: "low" | "normal" | "high" | "overloaded";
}

interface SquadAnalysisCardProps {
  squad: SquadAnalysis;
  onCreateTask: (squad: SquadAnalysis) => void;
}

const getStatusColor = (status: SquadAnalysis["status"]) => {
  switch (status) {
    case "excellent":
      return "text-green-600";
    case "good":
      return "text-blue-600";
    case "needs_attention":
      return "text-yellow-600";
    case "critical":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
};

const getStatusBadge = (status: SquadAnalysis["status"]) => {
  const variants = {
    excellent: "default",
    good: "secondary",
    needs_attention: "outline",
    critical: "destructive",
  } as const;

  const labels = {
    excellent: "Excelente",
    good: "Bom",
    needs_attention: "Precisa de Atenção",
    critical: "Crítico",
  };

  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
};

const getStatusIcon = (status: SquadAnalysis["status"]) => {
  switch (status) {
    case "excellent":
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case "good":
      return <Target className="w-4 h-4 text-blue-600" />;
    case "needs_attention":
      return <Clock className="w-4 h-4 text-yellow-600" />;
    case "critical":
      return <AlertTriangle className="w-4 h-4 text-red-600" />;
    default:
      return <Users className="w-4 h-4 text-gray-600" />;
  }
};

export const SquadAnalysisCard = React.memo(({ squad, onCreateTask }: SquadAnalysisCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-lg"
              style={{
                backgroundColor: squad.icon_bg,
                color: squad.icon_color,
              }}
            >
              {squad.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{squad.name}</CardTitle>
              <CardDescription>{squad.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(squad.status)}
            {getStatusBadge(squad.status)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Problemas identificados */}
        {squad.issues.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Problemas Identificados
            </h4>
            <ul className="space-y-1">
              {squad.issues.map((issue, index) => (
                <li
                  key={index}
                  className="text-sm text-destructive flex items-center gap-2"
                >
                  <div className="w-1 h-1 rounded-full bg-destructive" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recomendações */}
        {squad.recommendations.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Recomendações
            </h4>
            <ul className="space-y-1">
              {squad.recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="text-sm text-muted-foreground flex items-center gap-2"
                >
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Métricas */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Métricas de Performance
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">
                {squad.totalTasks}
              </div>
              <div className="text-xs text-muted-foreground">Total Tarefas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {squad.completedTasks}
              </div>
              <div className="text-xs text-muted-foreground">Concluídas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {squad.inProgressTasks}
              </div>
              <div className="text-xs text-muted-foreground">Em Andamento</div>
            </div>
            <div className="text-center">
              <div
                className={`text-lg font-bold ${getStatusColor(squad.status)}`}
              >
                {squad.productivity}%
              </div>
              <div className="text-xs text-muted-foreground">Produtividade</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">
                {squad.avgProgress}%
              </div>
              <div className="text-xs text-muted-foreground">
                Progresso Médio
              </div>
            </div>
          </div>
        </div>

        {/* Botão de ação para squads problemáticos */}
        {(squad.status === "critical" || squad.status === "needs_attention") && (
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateTask(squad)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Tarefa
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

SquadAnalysisCard.displayName = "SquadAnalysisCard";
