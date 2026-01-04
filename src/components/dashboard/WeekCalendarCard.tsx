import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfWeek, addDays, isToday, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DayTasks {
  date: Date;
  tasks: Array<{
    id: string;
    title: string;
    priority: string;
  }>;
}

const priorityColors: Record<string, string> = {
  high: 'bg-destructive',
  medium: 'bg-warning',
  low: 'bg-primary'
};

export const WeekCalendarCard = () => {
  const { activeCompany } = useCompany();
  const { user } = useAuth();

  const { data: weekData = [], isLoading } = useQuery({
    queryKey: ['week-calendar', activeCompany?.company_id, user?.id],
    queryFn: async () => {
      if (!activeCompany?.company_id || !user?.id) return [];

      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
      const weekEnd = addDays(weekStart, 6);

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, priority, due_date')
        .eq('company_id', activeCompany.company_id)
        .neq('status', 'done')
        .gte('due_date', weekStart.toISOString())
        .lte('due_date', weekEnd.toISOString())
        .or(`assigned_user_id.eq.${user.id},and(user_id.eq.${user.id},assigned_user_id.is.null)`)
        .order('due_date');

      if (error) throw error;

      // Organize tasks by day
      const days: DayTasks[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        const dayTasks = (tasks || []).filter(task => 
          task.due_date && isSameDay(parseISO(task.due_date), date)
        );
        days.push({ date, tasks: dayTasks });
      }

      return days;
    },
    enabled: !!activeCompany?.company_id && !!user?.id
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendário da Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Calendário da Semana
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weekData.map((day, index) => {
            const isCurrentDay = isToday(day.date);
            const hasHighPriority = day.tasks.some(t => t.priority === 'high');
            
            return (
              <div
                key={index}
                className={`
                  relative p-2 rounded-lg border min-h-[80px] transition-colors
                  ${isCurrentDay 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50 hover:border-border'
                  }
                `}
              >
                <div className="text-center mb-2">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    {format(day.date, 'EEE', { locale: ptBR })}
                  </p>
                  <p className={`text-sm font-medium ${isCurrentDay ? 'text-primary' : ''}`}>
                    {format(day.date, 'd')}
                  </p>
                </div>
                
                {day.tasks.length > 0 && (
                  <div className="space-y-1">
                    {day.tasks.slice(0, 2).map(task => (
                      <div
                        key={task.id}
                        className="flex items-center gap-1"
                        title={task.title}
                      >
                        <div 
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityColors[task.priority] || 'bg-muted'}`} 
                        />
                        <span className="text-[10px] truncate">
                          {task.title}
                        </span>
                      </div>
                    ))}
                    {day.tasks.length > 2 && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">
                        +{day.tasks.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
                
                {hasHighPriority && (
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
