import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Loader2, Brain, Users, Calendar, Zap } from "lucide-react";

interface OrganizingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'running' | 'completed';
}

interface OrganizingProgressModalProps {
  open: boolean;
  currentStep: number;
  totalSteps: number;
  message?: string;
}

export const OrganizingProgressModal: React.FC<OrganizingProgressModalProps> = ({
  open,
  currentStep,
  totalSteps,
  message = "Organizando tarefas...",
}) => {
  const steps: OrganizingStep[] = [
    {
      id: 'analyzing',
      title: 'Analisando Tarefas',
      description: 'Compreendendo o contexto e prioridades das tarefas',
      icon: <Brain className="h-5 w-5" />,
      status: currentStep > 0 ? 'completed' : currentStep === 0 ? 'running' : 'pending',
    },
    {
      id: 'evaluating',
      title: 'Avaliando Colaboradores',
      description: 'Verificando disponibilidade e capacidade da equipe',
      icon: <Users className="h-5 w-5" />,
      status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'running' : 'pending',
    },
    {
      id: 'matching',
      title: 'Combinando Slots',
      description: 'Encontrando a melhor combinação tarefa-horário-pessoa',
      icon: <Calendar className="h-5 w-5" />,
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'running' : 'pending',
    },
    {
      id: 'optimizing',
      title: 'Otimizando Distribuição',
      description: 'Balanceando carga de trabalho e maximizando eficiência',
      icon: <Zap className="h-5 w-5" />,
      status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'running' : 'pending',
    },
  ];

  const progress = ((currentStep + 1) / totalSteps) * 100;

  const getStepIcon = (step: OrganizingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStepStyles = (step: OrganizingStep) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-200 bg-green-50 text-green-900';
      case 'running':
        return 'border-primary bg-primary/5 text-primary-foreground';
      default:
        return 'border-muted bg-muted/20 text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            Organizando com IA
          </DialogTitle>
          <DialogDescription>
            Nossa IA está analisando e organizando suas tarefas de forma inteligente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Barra de Progresso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Mensagem Atual */}
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <p className="text-sm text-center text-muted-foreground">
                {message}
              </p>
            </CardContent>
          </Card>

          {/* Etapas do Processo */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Etapas do Processo</h4>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <Card key={step.id} className={`transition-colors ${getStepStyles(step)}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getStepIcon(step)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium opacity-60">
                            {index + 1}.
                          </span>
                          <p className="font-medium text-sm">{step.title}</p>
                        </div>
                        <p className="text-xs opacity-80 mt-1">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Dica */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-xs text-blue-800">
                    <strong>Dica:</strong> A IA considera fatores como prioridade das tarefas, 
                    disponibilidade dos colaboradores, compatibilidade tarefa-horário e 
                    balanceamento de carga de trabalho.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};