import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Trophy, Medal, Award, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ClassificationCount {
  classification: string | null;
  count: number;
}

export function LeadClassificationStats() {
  const { activeCompany } = useCompany();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['lead-classification-stats', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return null;

      // Get total leads
      const { count: total } = await supabase
        .from('lead_master_pool')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', activeCompany.id);

      // Get classification counts
      const { data: ouroData } = await supabase
        .from('lead_master_pool')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', activeCompany.id)
        .eq('lead_classification', 'ouro');

      const { data: prataData, count: prataCount } = await supabase
        .from('lead_master_pool')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', activeCompany.id)
        .eq('lead_classification', 'prata');

      const { data: bronzeData, count: bronzeCount } = await supabase
        .from('lead_master_pool')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', activeCompany.id)
        .eq('lead_classification', 'bronze');

      const { count: ouroCount } = await supabase
        .from('lead_master_pool')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', activeCompany.id)
        .eq('lead_classification', 'ouro');

      const { count: naoClassificadoCount } = await supabase
        .from('lead_master_pool')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', activeCompany.id)
        .is('lead_classification', null);

      return {
        total: total || 0,
        ouro: ouroCount || 0,
        prata: prataCount || 0,
        bronze: bronzeCount || 0,
        naoClassificado: naoClassificadoCount || 0,
      };
    },
    enabled: !!activeCompany?.id,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const classifications = [
    {
      label: 'Ouro',
      value: stats?.ouro || 0,
      percentage: stats?.total ? Math.round((stats.ouro / stats.total) * 100) : 0,
      icon: Trophy,
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      textColor: 'text-amber-700 dark:text-amber-400',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Prata',
      value: stats?.prata || 0,
      percentage: stats?.total ? Math.round((stats.prata / stats.total) * 100) : 0,
      icon: Medal,
      bgColor: 'bg-slate-100 dark:bg-slate-800/50',
      textColor: 'text-slate-700 dark:text-slate-300',
      iconColor: 'text-slate-400',
    },
    {
      label: 'Bronze',
      value: stats?.bronze || 0,
      percentage: stats?.total ? Math.round((stats.bronze / stats.total) * 100) : 0,
      icon: Award,
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      textColor: 'text-orange-700 dark:text-orange-400',
      iconColor: 'text-orange-500',
    },
    {
      label: 'Não Classificado',
      value: stats?.naoClassificado || 0,
      percentage: stats?.total ? Math.round((stats.naoClassificado / stats.total) * 100) : 0,
      icon: Users,
      bgColor: 'bg-muted',
      textColor: 'text-muted-foreground',
      iconColor: 'text-muted-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {classifications.map(({ label, value, percentage, icon: Icon, bgColor, textColor, iconColor }) => (
        <Card key={label} className={cn("border-0 shadow-sm", bgColor)}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-xs font-medium uppercase tracking-wide", textColor)}>
                  {label}
                </p>
                <p className={cn("text-2xl font-bold mt-1", textColor)}>
                  {value}
                </p>
                <p className={cn("text-xs mt-0.5 opacity-70", textColor)}>
                  {percentage}% do total
                </p>
              </div>
              <div className={cn("p-2 rounded-full", bgColor)}>
                <Icon className={cn("w-6 h-6", iconColor)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
