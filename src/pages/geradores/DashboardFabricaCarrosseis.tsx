import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Layers, Clock, CheckCircle, XCircle, Eye, TrendingUp, LayoutGrid, BookOpen, Users, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardFabricaCarrosseis() {
  const { activeCompany } = useCompany();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['carousel-factory-stats', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return null;

      // Get active schedules count
      const { count: activeSchedules } = await supabase
        .from('carousel_generation_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', activeCompany.company_id)
        .eq('is_active', true);

      // Get carousels by status
      const { data: carousels } = await supabase
        .from('carousel_generation_queue')
        .select('status, carousel_type')
        .eq('company_id', activeCompany.company_id);

      const pending = carousels?.filter(c => c.status === 'pending').length || 0;
      const approved = carousels?.filter(c => c.status === 'approved').length || 0;
      const rejected = carousels?.filter(c => c.status === 'rejected').length || 0;
      const published = carousels?.filter(c => c.status === 'published').length || 0;

      // Count by type
      const tutorial = carousels?.filter(c => c.carousel_type === 'tutorial').length || 0;
      const comparison = carousels?.filter(c => c.carousel_type === 'comparison').length || 0;
      const behindScenes = carousels?.filter(c => c.carousel_type === 'behind_scenes').length || 0;
      const curatedList = carousels?.filter(c => c.carousel_type === 'curated_list').length || 0;

      // Get today's generations
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: todayCount } = await supabase
        .from('carousel_generation_queue')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', activeCompany.company_id)
        .gte('generated_at', today.toISOString());

      return {
        activeSchedules: activeSchedules || 0,
        pending,
        approved,
        rejected,
        published,
        todayCount: todayCount || 0,
        total: carousels?.length || 0,
        byType: { tutorial, comparison, behindScenes, curatedList }
      };
    },
    enabled: !!activeCompany?.company_id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard - Fábrica de Carrosseis</h1>
          <p className="text-muted-foreground">Métricas de geração de carrosseis</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
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

  const typeCards = [
    { label: "Tutorial/Hack", count: stats?.byType.tutorial || 0, icon: BookOpen, color: "text-blue-500" },
    { label: "Nós vs. Eles", count: stats?.byType.comparison || 0, icon: Users, color: "text-orange-500" },
    { label: "Bastidores", count: stats?.byType.behindScenes || 0, icon: Sparkles, color: "text-purple-500" },
    { label: "Curadoria", count: stats?.byType.curatedList || 0, icon: LayoutGrid, color: "text-green-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard - Fábrica de Carrosseis</h1>
        <p className="text-muted-foreground">Métricas de geração de carrosseis</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fábricas Ativas</CardTitle>
            <Layers className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSchedules || 0}</div>
            <p className="text-xs text-muted-foreground">Clientes com geração ativa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gerados Hoje</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayCount || 0}</div>
            <p className="text-xs text-muted-foreground">Carrosseis gerados hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Revisão</CardTitle>
            <Eye className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">Pendentes de aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gerado</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Total de carrosseis</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.approved || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.rejected || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publicados</CardTitle>
            <Layers className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-600">{stats?.published || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total && stats.total > 0 
                ? Math.round(((stats.approved + stats.published) / stats.total) * 100) 
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tipo de Carrossel</CardTitle>
          <CardDescription>Carrosseis gerados por categoria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {typeCards.map((type) => (
              <div key={type.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <type.icon className={`h-5 w-5 ${type.color}`} />
                <div>
                  <p className="font-medium">{type.label}</p>
                  <p className="text-2xl font-bold">{type.count}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
