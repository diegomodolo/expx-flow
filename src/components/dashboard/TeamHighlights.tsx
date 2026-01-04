import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Star, TrendingUp, Flame, Award } from "lucide-react";
import { startOfWeek, endOfWeek } from "date-fns";

interface Highlight {
  type: "top_performer" | "best_campaign" | "most_creatives";
  title: string;
  subtitle: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  avatar?: string;
  name?: string;
}

export function TeamHighlights() {
  const { activeCompany } = useCompany();

  const { data: highlights = [], isLoading } = useQuery({
    queryKey: ["team-highlights", activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const results: Highlight[] = [];

      // Get top performer (most tasks completed this week)
      const { data: topPerformer } = await supabase
        .from("tasks")
        .select(`
          assigned_user_id,
          completed_at
        `)
        .eq("company_id", activeCompany.company_id)
        .eq("status", "done")
        .gte("completed_at", weekStart.toISOString())
        .lte("completed_at", weekEnd.toISOString());

      if (topPerformer && topPerformer.length > 0) {
        const counts: Record<string, number> = {};
        topPerformer.forEach((task: any) => {
          if (task.assigned_user_id) {
            counts[task.assigned_user_id] = (counts[task.assigned_user_id] || 0) + 1;
          }
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
          const [userId, count] = sorted[0];
          
          // Get employee name
          const { data: employee } = await supabase
            .from("employees")
            .select("name, avatar")
            .eq("user_id", userId)
            .single();

          if (employee) {
            results.push({
              type: "top_performer",
              title: "Destaque da Semana",
              subtitle: employee.name,
              value: `${count} tarefas`,
              icon: Trophy,
              color: "text-yellow-600 dark:text-yellow-400",
              bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
              avatar: employee.avatar || undefined,
              name: employee.name,
            });
          }
        }
      }

      // Get best performing campaign (lowest CPA with significant spend)
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select(`
          name,
          cpa,
          spend,
          conversions
        `)
        .eq("company_id", activeCompany.company_id)
        .eq("status", "active")
        .gt("spend", 100)
        .gt("conversions", 5)
        .order("cpa", { ascending: true })
        .limit(1);

      if (campaigns && campaigns.length > 0) {
        const campaign = campaigns[0] as any;
        results.push({
          type: "best_campaign",
          title: "Melhor Campanha",
          subtitle: campaign.name.length > 25 ? campaign.name.slice(0, 25) + "..." : campaign.name,
          value: `CPA R$ ${campaign.cpa?.toFixed(2) || "0"}`,
          icon: TrendingUp,
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-100 dark:bg-green-900/30",
        });
      }

      // Get most creatives generated this week
      const { data: creatives } = await supabase
        .from("creative_generation_queue")
        .select("client_id")
        .eq("company_id", activeCompany.company_id)
        .gte("generated_at", weekStart.toISOString())
        .lte("generated_at", weekEnd.toISOString());

      if (creatives && creatives.length > 0) {
        results.push({
          type: "most_creatives",
          title: "Criativos Gerados",
          subtitle: "Esta semana",
          value: `${creatives.length} criativos`,
          icon: Flame,
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-100 dark:bg-orange-900/30",
        });
      }

      return results;
    },
    enabled: !!activeCompany?.company_id,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Destaques</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (highlights.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Destaques</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Award className="w-10 h-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Destaques serão exibidos aqui
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Destaques</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {highlights.map((highlight, index) => {
            const Icon = highlight.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${highlight.bgColor}`}>
                  {highlight.avatar ? (
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={highlight.avatar} />
                      <AvatarFallback>
                        {highlight.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Icon className={`w-5 h-5 ${highlight.color}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{highlight.title}</p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {highlight.subtitle}
                  </p>
                </div>
                <Badge variant="secondary" className={`${highlight.bgColor} ${highlight.color}`}>
                  {highlight.value}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
