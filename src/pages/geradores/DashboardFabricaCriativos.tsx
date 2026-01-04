import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Palette, CheckCircle, XCircle, Clock, Image, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardFabricaCriativos() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["fabrica-criativos-stats", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      // Buscar fábricas ativas
      const { data: schedules } = await supabase
        .from("creative_generation_schedules")
        .select("id, is_active, creatives_per_day")
        .eq("company_id", companyId);

      const activeFabricas = schedules?.filter(s => s.is_active).length || 0;
      const totalFabricas = schedules?.length || 0;

      // Buscar criativos gerados
      const { data: creatives } = await supabase
        .from("creative_generation_queue")
        .select("id, status, generated_at")
        .eq("company_id", companyId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
      
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const creativesToday = creatives?.filter(c => new Date(c.generated_at) >= today).length || 0;
      const creativesThisWeek = creatives?.filter(c => new Date(c.generated_at) >= thisWeekStart).length || 0;
      const creativesThisMonth = creatives?.filter(c => new Date(c.generated_at) >= thisMonthStart).length || 0;

      const pendingReview = creatives?.filter(c => c.status === "pending").length || 0;
      const approved = creatives?.filter(c => c.status === "approved").length || 0;
      const rejected = creatives?.filter(c => c.status === "rejected").length || 0;
      const published = creatives?.filter(c => c.status === "published").length || 0;

      const totalReviewed = approved + rejected;
      const approvalRate = totalReviewed > 0 ? Math.round((approved / totalReviewed) * 100) : 0;

      return {
        activeFabricas,
        totalFabricas,
        creativesToday,
        creativesThisWeek,
        creativesThisMonth,
        pendingReview,
        approved,
        rejected,
        published,
        approvalRate,
      };
    },
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Métricas da fábrica de criativos</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Métricas da fábrica de criativos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fábricas Ativas</CardTitle>
            <Palette className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeFabricas || 0}</div>
            <p className="text-xs text-muted-foreground">
              de {stats?.totalFabricas || 0} configuradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Criativos Hoje</CardTitle>
            <Image className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.creativesToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.creativesThisWeek || 0} esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes de Revisão</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingReview || 0}</div>
            <p className="text-xs text-muted-foreground">
              aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approvalRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              dos criativos revisados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approved || 0}</div>
            <p className="text-xs text-muted-foreground">
              criativos aprovados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.rejected || 0}</div>
            <p className="text-xs text-muted-foreground">
              criativos rejeitados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publicados</CardTitle>
            <Palette className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.published || 0}</div>
            <p className="text-xs text-muted-foreground">
              criativos publicados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
            <Image className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.creativesThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">
              criativos gerados
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
