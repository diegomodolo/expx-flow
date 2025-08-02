import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Target, AlertTriangle, CheckCircle } from "lucide-react";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";

interface TaskSuggestion {
  id: string;
  title: string;
  description: string;
  campaignReference?: string;
  priority: 'high' | 'medium' | 'low';
  type: 'optimization' | 'activation' | 'review';
}

interface TaskSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    name: string;
    issues: string[];
    problematic_campaigns: string[];
    ai_recommendations: string[];
  };
}

export function TaskSuggestionsModal({ isOpen, onClose, client }: TaskSuggestionsModalProps) {
  const { createTaskFromAlert, isCreating } = useTaskAutomation();
  const [createdTasks, setCreatedTasks] = useState<Set<string>>(new Set());

  // Debug: Log do cliente recebido
  console.log('TaskSuggestionsModal - Cliente recebido:', client);
  console.log('TaskSuggestionsModal - Issues do cliente:', client.issues);
  console.log('TaskSuggestionsModal - Campanhas problemáticas:', client.problematic_campaigns);

  const generateDetailedSuggestions = (): TaskSuggestion[] => {
    console.log('TaskSuggestionsModal - Gerando sugestões para cliente:', client.name);
    console.log('TaskSuggestionsModal - Issues disponíveis:', client.issues);
    
    const suggestions: TaskSuggestion[] = [];
    
    // Se não tem campanhas ativas
    if (client.issues.includes('Sem campanhas ativas')) {
      console.log('TaskSuggestionsModal - Cliente sem campanhas ativas detectado');
      suggestions.push({
        id: 'activate-campaigns',
        title: 'Ativar Campanhas Urgentemente',
        description: `Cliente ${client.name} está sem campanhas ativas. É necessário reativar ou criar novas campanhas imediatamente para retomar a geração de leads.`,
        priority: 'high',
        type: 'activation'
      });
      
      suggestions.push({
        id: 'strategy-review',
        title: 'Revisar Estratégia de Marketing',
        description: `Agendar reunião com o cliente ${client.name} para entender os motivos da pausa nas campanhas e definir nova estratégia.`,
        priority: 'high',
        type: 'review'
      });
      
      return suggestions;
    }

    // Sugestões baseadas nos problemas identificados
    client.issues.forEach((issue, index) => {
      if (issue.includes('CPL acima da meta')) {
        const campaignRef = client.problematic_campaigns[0] || 'campanhas ativas';
        suggestions.push({
          id: `cpl-optimization-${index}`,
          title: 'Otimizar CPL Alto',
          description: `Reduzir custo por lead em ${campaignRef}. Revisar segmentação, criativos e palavras-chave para melhorar eficiência.`,
          campaignReference: campaignRef,
          priority: 'high',
          type: 'optimization'
        });
      }
      
      if (issue.includes('CPA acima da meta')) {
        const campaignRef = client.problematic_campaigns[0] || 'campanhas ativas';
        suggestions.push({
          id: `cpa-optimization-${index}`,
          title: 'Reduzir CPA Elevado',
          description: `Otimizar custo por aquisição em ${campaignRef}. Analisar funil de conversão e ajustar lances para melhorar ROI.`,
          campaignReference: campaignRef,
          priority: 'high',
          type: 'optimization'
        });
      }
      
      if (issue.includes('CTR abaixo do mínimo')) {
        const campaignRef = client.problematic_campaigns[0] || 'campanhas ativas';
        suggestions.push({
          id: `ctr-optimization-${index}`,
          title: 'Melhorar Taxa de Cliques',
          description: `Aumentar CTR em ${campaignRef}. Testar novos criativos, headlines e chamadas para ação mais atrativas.`,
          campaignReference: campaignRef,
          priority: 'medium',
          type: 'optimization'
        });
      }
      
      if (issue.includes('Frequência muito alta')) {
        const campaignRef = client.problematic_campaigns[0] || 'campanhas ativas';
        suggestions.push({
          id: `frequency-optimization-${index}`,
          title: 'Reduzir Saturação do Público',
          description: `Diminuir frequência em ${campaignRef}. Expandir audiência ou pausar anúncios para evitar fadiga criativa.`,
          campaignReference: campaignRef,
          priority: 'medium',
          type: 'optimization'
        });
      }
    });

    // Adicionar sugestão de análise geral se há múltiplos problemas
    if (client.issues.length >= 2) {
      suggestions.push({
        id: 'comprehensive-review',
        title: 'Análise Completa da Conta',
        description: `Realizar auditoria completa das campanhas do cliente ${client.name} devido aos múltiplos problemas identificados.`,
        priority: 'high',
        type: 'review'
      });
    }

    console.log('TaskSuggestionsModal - Sugestões geradas:', suggestions.length);
    console.log('TaskSuggestionsModal - Lista de sugestões:', suggestions);

    return suggestions;
  };

  const suggestions = generateDetailedSuggestions();

  const handleCreateTask = async (suggestion: TaskSuggestion) => {
    try {
      await createTaskFromAlert.mutateAsync({
        alertType: suggestion.priority === 'high' ? 'high_cpa' : 'performance_issue',
        alertDescription: suggestion.description,
        relatedClientId: client.id,
        alertId: `suggestion_${suggestion.id}`,
      });
      
      setCreatedTasks(prev => new Set([...prev, suggestion.id]));
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'activation': return AlertTriangle;
      case 'optimization': return Target;
      case 'review': return Lightbulb;
      default: return Lightbulb;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Sugestões de Tarefas para {client.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {suggestions.map((suggestion) => {
            const Icon = getIcon(suggestion.type);
            const isTaskCreated = createdTasks.has(suggestion.id);
            
            return (
              <Card key={suggestion.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 text-primary mt-1" />
                      <div className="space-y-2">
                        <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant={getPriorityColor(suggestion.priority) as any}>
                            Prioridade {suggestion.priority === 'high' ? 'Alta' : suggestion.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                          {suggestion.campaignReference && (
                            <Badge variant="outline">
                              📊 {suggestion.campaignReference}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleCreateTask(suggestion)}
                      disabled={isCreating || isTaskCreated}
                      className="min-w-[120px]"
                    >
                      {isTaskCreated ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Criada
                        </>
                      ) : isCreating ? (
                        'Criando...'
                      ) : (
                        'Criar Tarefa'
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed">
                    {suggestion.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}