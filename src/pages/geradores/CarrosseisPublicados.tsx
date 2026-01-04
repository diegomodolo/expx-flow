import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Rocket, Layers, BookOpen, Users, Sparkles, LayoutGrid, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface Slide {
  position: number;
  type: string;
  headline?: string;
  image_url?: string;
  [key: string]: any;
}

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

const typeColors: Record<string, string> = {
  tutorial: "bg-blue-100 text-blue-700",
  comparison: "bg-orange-100 text-orange-700",
  behind_scenes: "bg-purple-100 text-purple-700",
  curated_list: "bg-green-100 text-green-700",
};

export default function CarrosseisPublicados() {
  const { activeCompany } = useCompany();

  const { data: carousels, isLoading } = useQuery({
    queryKey: ['published-carousels', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      const { data, error } = await supabase
        .from('carousel_generation_queue')
        .select(`
          id,
          carousel_type,
          slides,
          theme,
          caption,
          status,
          published_at,
          clients (name)
        `)
        .eq('company_id', activeCompany.company_id)
        .in('status', ['approved', 'published'])
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) throw error;
      return data.map(item => ({
        ...item,
        slides: (item.slides as unknown as Slide[]) || []
      }));
    },
    enabled: !!activeCompany?.company_id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Carrosseis Publicados</h1>
          <p className="text-muted-foreground">Carrosseis aprovados e prontos para publicação</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-48 w-full mb-4" />
                <Skeleton className="h-4 w-3/4" />
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
        <h1 className="text-2xl font-bold">Carrosseis Publicados</h1>
        <p className="text-muted-foreground">Carrosseis aprovados e prontos para publicação</p>
      </div>

      {carousels && carousels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum carrossel publicado</h3>
            <p className="text-muted-foreground text-center mt-2">
              Os carrosseis aprovados aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {carousels?.map((carousel) => {
            const TypeIcon = typeIcons[carousel.carousel_type] || Layers;
            const firstSlide = carousel.slides[0];
            
            return (
              <Card key={carousel.id} className="overflow-hidden">
                <div className="aspect-square bg-muted relative">
                  {firstSlide?.image_url ? (
                    <img 
                      src={firstSlide.image_url} 
                      alt="Capa do carrossel"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-violet-500/5">
                      <Layers className="h-16 w-16 text-violet-500/50" />
                    </div>
                  )}
                  <Badge className={`absolute top-2 left-2 ${typeColors[carousel.carousel_type]}`}>
                    <TypeIcon className="h-3 w-3 mr-1" />
                    {typeLabels[carousel.carousel_type]}
                  </Badge>
                  <Badge className="absolute top-2 right-2 bg-green-100 text-green-700">
                    {carousel.status === 'published' ? 'Publicado' : 'Aprovado'}
                  </Badge>
                </div>
                
                <CardContent className="p-4">
                  <p className="font-medium text-sm mb-1">
                    {carousel.clients?.name || 'Cliente'}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {firstSlide?.headline || carousel.theme || 'Sem título'}
                  </p>
                  {carousel.published_at && (
                    <p className="text-xs text-muted-foreground">
                      Publicado em {format(new Date(carousel.published_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
