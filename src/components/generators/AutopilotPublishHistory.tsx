import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Rocket, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PublishedAd {
  id: string;
  published_at: string;
  generated_content: {
    headline?: string;
    primary_text?: string;
    description?: string;
    image_url?: string;
  };
  quality_score: number | null;
  client: {
    id: string;
    name: string;
    company: string;
    avatar: string | null;
  } | null;
}

export function AutopilotPublishHistory() {
  const { activeCompany } = useCompany();
  const [publishedAds, setPublishedAds] = useState<PublishedAd[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCompany?.company_id) return;

    const fetchPublishedAds = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("ad_generation_queue")
          .select(`
            id,
            published_at,
            generated_content,
            quality_score,
            clients:client_id (
              id,
              name,
              company,
              avatar
            )
          `)
          .eq("company_id", activeCompany.company_id)
          .eq("status", "published")
          .not("published_at", "is", null)
          .order("published_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        const formattedData = (data || []).map((item: any) => ({
          id: item.id,
          published_at: item.published_at,
          generated_content: item.generated_content as PublishedAd["generated_content"],
          quality_score: item.quality_score,
          client: item.clients,
        }));

        setPublishedAds(formattedData);
      } catch (error) {
        console.error("Erro ao carregar histórico de publicações:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPublishedAds();
  }, [activeCompany?.company_id]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const truncateText = (text: string | undefined, maxLength: number) => {
    if (!text) return "-";
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/5">
            <Rocket className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">
              Histórico de Publicações Autopilot
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Criativos publicados automaticamente via autopilot
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : publishedAds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Rocket className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhuma publicação autopilot ainda</p>
            <p className="text-sm">
              Configure o autopilot para publicar anúncios automaticamente
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[200px]">Cliente</TableHead>
                  <TableHead className="w-[250px]">Headline</TableHead>
                  <TableHead>Legenda</TableHead>
                  <TableHead className="w-[100px] text-center">Score</TableHead>
                  <TableHead className="w-[180px] text-right">
                    Data de Publicação
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {publishedAds.map((ad) => (
                  <TableRow key={ad.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={ad.client?.avatar || ""}
                            alt={ad.client?.name || ""}
                          />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {ad.client ? getInitials(ad.client.name) : "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {ad.client?.name || "Cliente removido"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {ad.client?.company || "-"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium truncate max-w-[230px]">
                        {truncateText(ad.generated_content?.headline, 40)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                        {truncateText(ad.generated_content?.primary_text, 60)}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      {ad.quality_score ? (
                        <Badge
                          variant={
                            ad.quality_score >= 8
                              ? "default"
                              : ad.quality_score >= 6
                              ? "secondary"
                              : "outline"
                          }
                          className={
                            ad.quality_score >= 8
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : ad.quality_score >= 6
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : ""
                          }
                        >
                          {ad.quality_score.toFixed(1)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm">
                        <p className="font-medium">
                          {format(new Date(ad.published_at), "dd MMM yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(ad.published_at), "HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
