import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { History, Layers, CheckCircle, XCircle, Clock, BookOpen, Users, Sparkles, LayoutGrid } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeIcons: Record<string, typeof BookOpen> = {
  tutorial: BookOpen,
  comparison: Users,
  behind_scenes: Sparkles,
  curated_list: LayoutGrid,
};

const typeLabels: Record<string, string> = {
  tutorial: "Tutorial/Hack",
  comparison: "Nós vs. Eles",
  behind_scenes: "Bastidores",
  curated_list: "Curadoria",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  published: "bg-violet-100 text-violet-700",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  published: "Publicado",
};

export default function HistoricoGeracoesCarrosseis() {
  const { activeCompany } = useCompany();

  const { data: carousels, isLoading } = useQuery({
    queryKey: ['carousel-history', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      const { data, error } = await supabase
        .from('carousel_generation_queue')
        .select(`
          id,
          carousel_type,
          theme,
          status,
          generated_at,
          reviewed_at,
          published_at,
          clients (name)
        `)
        .eq('company_id', activeCompany.company_id)
        .order('generated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.company_id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Histórico de Gerações</h1>
          <p className="text-muted-foreground">Timeline de carrosseis gerados</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
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
        <h1 className="text-2xl font-bold">Histórico de Gerações</h1>
        <p className="text-muted-foreground">Timeline de carrosseis gerados</p>
      </div>

      {carousels && carousels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum histórico</h3>
            <p className="text-muted-foreground text-center mt-2">
              O histórico de gerações aparecerá aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {carousels?.map((carousel) => {
            const TypeIcon = typeIcons[carousel.carousel_type] || Layers;
            
            return (
              <Card key={carousel.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <TypeIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{carousel.clients?.name || 'Cliente'}</h3>
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[carousel.carousel_type]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {carousel.theme || 'Sem tema definido'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">
                          {format(new Date(carousel.generated_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge className={statusColors[carousel.status]}>
                        {statusLabels[carousel.status]}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
