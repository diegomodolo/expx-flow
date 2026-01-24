import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, Download, Calendar, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { CarouselPreviewModal } from "./CarouselPreviewModal";
import { ClientSearchCombobox } from "@/components/generators/ClientSearchCombobox";

type CarouselItem = {
  id: string;
  carousel_type: string;
  theme: string | null;
  status: string;
  created_at: string;
  slides: any[];
  caption: string | null;
  client: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
};

export function CarouselHistoryList() {
  const { activeCompany } = useCompany();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [page, setPage] = useState(0);
  const [previewCarousel, setPreviewCarousel] = useState<CarouselItem | null>(null);
  const pageSize = 12;

  // Fetch clients for filter
  const { data: clients = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["clients-for-carousel-history", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("id, name")
        .eq("company_id", activeCompany.id)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany?.id,
  });

  // Fetch carousels
  const { data, isLoading } = useQuery({
    queryKey: ["carousel-history", activeCompany?.id, selectedClientId, page],
    queryFn: async () => {
      if (!activeCompany?.id) return { items: [], total: 0 };

      let query = supabase
        .from("carousel_generation_queue")
        .select(
          `
          id,
          carousel_type,
          theme,
          status,
          created_at,
          slides,
          caption,
          clients:client_id (id, name, avatar_url)
        `,
          { count: "exact" }
        )
        .eq("company_id", activeCompany.id)
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
      }

      const { data: items, error, count } = await query;
      if (error) throw error;

      return {
        items: (items || []).map((item: any) => ({
          ...item,
          client: item.clients,
        })),
        total: count || 0,
      };
    },
    enabled: !!activeCompany?.id,
  });

  const carousels = data?.items || [];
  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "published":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Publicado</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tutorial: "Tutorial",
      comparison: "Comparação",
      behind_scenes: "Bastidores",
      curated_list: "Lista Curada",
    };
    return labels[type] || type;
  };

  const getFirstSlideImage = (slides: any[]): string | null => {
    if (!Array.isArray(slides) || slides.length === 0) return null;
    const first = slides[0];
    return first?.image_url || first?.imageUrl || null;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <div className="w-64">
          <ClientSearchCombobox
            clients={clients}
            value={selectedClientId}
            onValueChange={(v) => {
              setSelectedClientId(v === "all" ? "" : v);
              setPage(0);
            }}
            placeholder="Filtrar por cliente..."
            includeAllOption
            allOptionLabel="Todos os clientes"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {data?.total || 0} carrossel(is) encontrado(s)
        </p>
      </div>

      {/* Grid */}
      {carousels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">Nenhum carrossel encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Gere seu primeiro carrossel na aba "Gerar Novo"
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {carousels.map((carousel) => {
            const coverImage = getFirstSlideImage(carousel.slides);
            return (
              <Card
                key={carousel.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setPreviewCarousel(carousel)}
              >
                {/* Cover Image */}
                <div className="aspect-[4/5] bg-muted relative overflow-hidden">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt="Capa do carrossel"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layers className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                  </div>
                  {/* Slide count badge */}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-black/60 text-white border-0">
                      {Array.isArray(carousel.slides) ? carousel.slides.length : 0} slides
                    </Badge>
                  </div>
                </div>

                {/* Info */}
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(carousel.carousel_type)}
                    </Badge>
                    {getStatusBadge(carousel.status)}
                  </div>

                  {carousel.client && (
                    <p className="text-sm font-medium truncate">{carousel.client.name}</p>
                  )}

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(carousel.created_at), "dd MMM yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Preview Modal */}
      {previewCarousel && (
        <CarouselPreviewModal
          carousel={previewCarousel}
          open={!!previewCarousel}
          onOpenChange={(open) => !open && setPreviewCarousel(null)}
        />
      )}
    </div>
  );
}
