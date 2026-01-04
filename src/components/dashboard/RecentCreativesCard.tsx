import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, ArrowRight, LayoutGrid } from "lucide-react";

interface Creative {
  id: string;
  type: "image" | "carousel";
  image_url: string | null;
  title: string;
  client_name: string;
}

export function RecentCreativesCard() {
  const { activeCompany } = useCompany();
  const navigate = useNavigate();

  const { data: creatives = [], isLoading } = useQuery({
    queryKey: ["recent-creatives", activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      const results: Creative[] = [];

      // Get recent image creatives
      const { data: imageCreatives } = await supabase
        .from("creative_generation_queue")
        .select(`
          id,
          generated_content,
          client_id
        `)
        .eq("company_id", activeCompany.company_id)
        .in("status", ["approved", "pending"])
        .order("generated_at", { ascending: false })
        .limit(4);

      if (imageCreatives) {
        for (const creative of imageCreatives) {
          const content = creative.generated_content as any;
          if (content?.image_url) {
            const { data: client } = await supabase
              .from("clients")
              .select("name")
              .eq("id", creative.client_id)
              .single();

            results.push({
              id: creative.id,
              type: "image",
              image_url: content.image_url,
              title: content.headline || "Criativo",
              client_name: client?.name || "Cliente",
            });
          }
        }
      }

      // Get recent carousels
      const { data: carousels } = await supabase
        .from("carousel_generation_queue")
        .select(`
          id,
          theme,
          slides,
          client_id
        `)
        .eq("company_id", activeCompany.company_id)
        .in("status", ["approved", "pending"])
        .order("generated_at", { ascending: false })
        .limit(4);

      if (carousels) {
        for (const carousel of carousels) {
          const slides = carousel.slides as any[];
          const firstSlide = slides?.[0];
          if (firstSlide?.image_url) {
            const { data: client } = await supabase
              .from("clients")
              .select("name")
              .eq("id", carousel.client_id)
              .single();

            results.push({
              id: carousel.id,
              type: "carousel",
              image_url: firstSlide.image_url,
              title: carousel.theme || `Carrossel ${slides?.length || 0} slides`,
              client_name: client?.name || "Cliente",
            });
          }
        }
      }

      // Sort by recency (interleave images and carousels)
      return results.slice(0, 4);
    },
    enabled: !!activeCompany?.company_id,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Criativos Recentes</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => navigate("/repositorio-criativos")}
          >
            Ver todos
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : creatives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Image className="w-10 h-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum criativo ainda
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate("/geradores")}
              className="mt-2"
            >
              Gerar primeiro criativo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {creatives.map((creative) => (
              <div
                key={creative.id}
                className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer"
                onClick={() => navigate("/repositorio-criativos")}
              >
                <img
                  src={creative.image_url || "/placeholder.svg"}
                  alt={creative.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-xs font-medium truncate">
                      {creative.title}
                    </p>
                    <p className="text-white/70 text-xs truncate">
                      {creative.client_name}
                    </p>
                  </div>
                </div>
                {creative.type === "carousel" && (
                  <div className="absolute top-2 right-2 bg-black/50 rounded p-1">
                    <LayoutGrid className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
