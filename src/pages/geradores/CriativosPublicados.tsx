import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Filter, Eye, Rocket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PublishedCreative {
  id: string;
  client_id: string;
  generated_content: {
    image_url?: string;
    caption?: string;
    hashtags?: string[];
    format?: string;
  };
  status: string;
  published_at: string | null;
  reviewed_at: string | null;
  clients?: {
    name: string;
    company: string;
  };
}

export default function CriativosPublicados() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [selectedCreative, setSelectedCreative] = useState<PublishedCreative | null>(null);

  const { data: clients } = useQuery({
    queryKey: ["clients-for-published", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("clients")
        .select("id, name, company")
        .eq("company_id", companyId)
        .eq("is_canceled", false)
        .order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: creatives, isLoading, refetch } = useQuery({
    queryKey: ["published-creatives", companyId, clientFilter],
    queryFn: async () => {
      if (!companyId) return [];
      
      let query = supabase
        .from("creative_generation_queue")
        .select(`
          id,
          client_id,
          generated_content,
          status,
          published_at,
          reviewed_at,
          clients (name, company)
        `)
        .eq("company_id", companyId)
        .in("status", ["approved", "published"])
        .order("reviewed_at", { ascending: false });

      if (clientFilter !== "all") {
        query = query.eq("client_id", clientFilter);
      }

      const { data } = await query;
      return (data || []) as unknown as PublishedCreative[];
    },
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Criativos Publicados</h1>
          <p className="text-muted-foreground">Criativos aprovados e publicados</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-48 w-full rounded-lg mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Criativos Publicados</h1>
          <p className="text-muted-foreground">Criativos aprovados e publicados</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {creatives?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum criativo aprovado ou publicado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {creatives?.map((creative) => (
            <Card key={creative.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {creative.clients?.name || "Cliente"}
                  </CardTitle>
                  <Badge 
                    className={creative.status === "published" 
                      ? "bg-purple-500/10 text-purple-500 border-purple-500/20" 
                      : "bg-green-500/10 text-green-500 border-green-500/20"
                    }
                  >
                    {creative.status === "published" ? "Publicado" : "Aprovado"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {creative.generated_content?.image_url ? (
                  <div 
                    className="relative aspect-square bg-muted rounded-lg overflow-hidden mb-3 cursor-pointer"
                    onClick={() => setSelectedCreative(creative)}
                  >
                    <img 
                      src={creative.generated_content.image_url} 
                      alt="Criativo"
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Eye className="h-8 w-8 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">Sem imagem</p>
                  </div>
                )}

                {creative.generated_content?.caption && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {creative.generated_content.caption}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  {creative.reviewed_at && format(new Date(creative.reviewed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedCreative} onOpenChange={() => setSelectedCreative(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview do Criativo</DialogTitle>
          </DialogHeader>
          {selectedCreative && (
            <div className="space-y-4">
              {selectedCreative.generated_content?.image_url && (
                <img 
                  src={selectedCreative.generated_content.image_url}
                  alt="Criativo"
                  className="w-full rounded-lg"
                />
              )}
              {selectedCreative.generated_content?.caption && (
                <div>
                  <p className="text-sm font-medium mb-1">Legenda:</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCreative.generated_content.caption}
                  </p>
                </div>
              )}
              {selectedCreative.generated_content?.hashtags && (
                <div>
                  <p className="text-sm font-medium mb-1">Hashtags:</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCreative.generated_content.hashtags.join(" ")}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Cliente: {selectedCreative.clients?.name}</span>
                <Badge 
                  className={selectedCreative.status === "published" 
                    ? "bg-purple-500/10 text-purple-500 border-purple-500/20" 
                    : "bg-green-500/10 text-green-500 border-green-500/20"
                  }
                >
                  {selectedCreative.status === "published" ? "Publicado" : "Aprovado"}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
