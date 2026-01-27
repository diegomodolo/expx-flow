import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Rocket, Flame, ClipboardList, Gem, Sun, Moon, Sparkles } from 'lucide-react';
import { useCSCockpitData } from '@/hooks/useCSCockpitData';
import { CSCockpitFires } from '@/components/cs/CSCockpitFires';
import { CSCockpitTasks } from '@/components/cs/CSCockpitTasks';
import { CSCockpitOpportunities } from '@/components/cs/CSCockpitOpportunities';
import { useCSSquadFilter } from '@/contexts/CSSquadFilterContext';
import { CSSquadFilter } from '@/components/cs/CSSquadFilter';
import { useAuth } from '@/hooks/useAuth';

function getGreeting(): { text: string; icon: React.ElementType } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Bom dia', icon: Sun };
  if (hour < 18) return { text: 'Boa tarde', icon: Sun };
  return { text: 'Boa noite', icon: Moon };
}

export default function CSCockpitPage() {
  const { user } = useAuth();
  const { selectedSquadId } = useCSSquadFilter();
  const { cockpitData, isLoading } = useCSCockpitData(selectedSquadId);
  
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'CS';
  
  const totalTasks = cockpitData.progress.total;
  const completedTasks = cockpitData.progress.completed;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header com saudação */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Cockpit da CS
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <GreetingIcon className="h-4 w-4" />
            {greeting.text}, {userName}! Aqui está seu painel de hoje.
          </p>
        </div>
        <CSSquadFilter />
      </div>

      {/* KPIs resumidos */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Incêndios</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">{cockpitData.fires.length}</p>
              </div>
              <Flame className="h-8 w-8 text-red-500/70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Tarefas</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                  {completedTasks}/{totalTasks}
                </p>
              </div>
              <ClipboardList className="h-8 w-8 text-blue-500/70" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Oportunidades</p>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{cockpitData.opportunities.length}</p>
              </div>
              <Gem className="h-8 w-8 text-amber-500/70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progresso do dia */}
      {totalTasks > 0 && (
        <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Meta do Dia</span>
              </div>
              <Badge variant={progressPercent === 100 ? "default" : "outline"}>
                {progressPercent}% concluído
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-3" />
            {progressPercent === 100 && (
              <p className="text-xs text-center mt-2 text-primary font-medium">
                🎉 Parabéns! Você completou todas as tarefas do dia!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3 Colunas principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CSCockpitFires fires={cockpitData.fires} isLoading={isLoading} />
        <CSCockpitTasks 
          tasks={cockpitData.tasks} 
          progress={cockpitData.progress}
          isLoading={isLoading} 
        />
        <CSCockpitOpportunities opportunities={cockpitData.opportunities} isLoading={isLoading} />
      </div>
    </div>
  );
}
