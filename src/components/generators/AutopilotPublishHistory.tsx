import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket, Eye, Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PublishedAd {
  id: string;
  published_at: string;
  generated_content: {
    headline?: string;
    primary_text?: string;
    body?: string;
    description?: string;
    image_url?: string;
    creative_image_url?: string;
  };
  quality_score: number | null;
  meta_ad_id: string | null;
  client: {
    id: string;
    name: string;
    company: string;
    avatar: string | null;
  } | null;
  campaign: {
    id: string;
    name: string;
  } | null;
  adset: {
    id: string;
    name: string;
  } | null;
}

export function AutopilotPublishHistory() {
  const { activeCompany } = useCompany();
  const [publishedAds, setPublishedAds] = useState<PublishedAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<PublishedAd | null>(null);

  useEffect(() => {
    if (!activeCompany?.company_id) return;

    const fetchPublishedAds = async () => {
      setLoading(true);
      try {
        // Buscar anúncios publicados com informações do schedule (onde está campanha/conjunto)
        const { data: adsData, error: adsError } = await supabase
          .from("ad_generation_queue")
          .select(`
            id,
            published_at,
            generated_content,
            quality_score,
            meta_ad_id,
            client_id,
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

        if (adsError) throw adsError;

        // Buscar schedules para obter campanha/conjunto de cada cliente
        const clientIds = [...new Set((adsData || []).map(a => a.client_id))];
        
        const { data: schedulesData } = await supabase
          .from("ad_generation_schedules")
          .select(`
            client_id,
            target_campaign_id,
            target_adset_id,
            campaigns:target_campaign_id (id, name),
            ad_sets:target_adset_id (id, name)
          `)
          .in("client_id", clientIds);

        // Criar mapa de schedules por client_id
        const scheduleMap = new Map();
        (schedulesData || []).forEach((s: any) => {
          scheduleMap.set(s.client_id, {
            campaign: s.campaigns,
            adset: s.ad_sets
          });
        });

        const formattedData: PublishedAd[] = (adsData || []).map((item: any) => {
          const scheduleInfo = scheduleMap.get(item.client_id) || {};
          
          return {
            id: item.id,
            published_at: item.published_at,
            generated_content: item.generated_content as PublishedAd["generated_content"],
            quality_score: item.quality_score,
            meta_ad_id: item.meta_ad_id,
            client: item.clients as any,
            campaign: scheduleInfo.campaign || null,
            adset: scheduleInfo.adset || null,
          };
        });

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

  const getAdText = (ad: PublishedAd) => {
    return ad.generated_content?.primary_text || ad.generated_content?.body || "";
  };

  const getAdImageUrl = (ad: PublishedAd) => {
    return (
      ad.generated_content?.image_url ||
      ad.generated_content?.creative_image_url ||
      null
    );
  };

  return (
    <>
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
                    <TableHead className="w-[80px] text-center">Ações</TableHead>
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
                          {truncateText(getAdText(ad), 60)}
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
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedAd(ad)}
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!selectedAd} onOpenChange={() => setSelectedAd(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview do Criativo
            </DialogTitle>
            <DialogDescription>
              Visualização do criativo no formato de publicação (mockup).
            </DialogDescription>
          </DialogHeader>

          {selectedAd && (
            <div className="p-6 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Instagram/Meta Mockup */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Preview do Anúncio
                  </h4>
                  <div className="bg-background border border-border rounded-lg overflow-hidden max-w-[350px] mx-auto shadow-lg">
                    {/* Header do post */}
                    <div className="flex items-center justify-between p-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={selectedAd.client?.avatar || ""} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {selectedAd.client ? getInitials(selectedAd.client.name) : "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold leading-tight">
                            {selectedAd.client?.name || "Anunciante"}
                          </p>
                          <p className="text-xs text-muted-foreground">Patrocinado</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Imagem do post */}
                    <div className="aspect-[3/4] bg-muted relative">
                      {getAdImageUrl(selectedAd) ? (
                        <img
                          src={getAdImageUrl(selectedAd)!}
                          alt={`Imagem do criativo publicado para ${selectedAd.client?.name || "cliente"}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Rocket className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Sem imagem</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ações do post */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Heart className="h-6 w-6 cursor-pointer hover:text-destructive transition-colors" />
                          <MessageCircle className="h-6 w-6 cursor-pointer" />
                          <Send className="h-6 w-6 cursor-pointer" />
                        </div>
                        <Bookmark className="h-6 w-6 cursor-pointer" />
                      </div>

                      {/* Headline */}
                      {selectedAd.generated_content?.headline && (
                        <p className="font-semibold text-sm">
                          {selectedAd.generated_content.headline}
                        </p>
                      )}

                      {/* Legenda */}
                      <div className="text-sm">
                        <span className="font-semibold">
                          {selectedAd.client?.name?.toLowerCase().replace(/\s+/g, '') || "anunciante"}
                        </span>{" "}
                        <span className="whitespace-pre-wrap">
                          {truncateText(getAdText(selectedAd), 150)}
                        </span>
                      </div>

                      {/* Data */}
                      <p className="text-xs text-muted-foreground uppercase">
                        {format(new Date(selectedAd.published_at), "d 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detalhes da publicação */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Detalhes da Publicação
                  </h4>

                  <div className="space-y-4 bg-muted/30 rounded-lg p-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Cliente
                      </label>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedAd.client?.avatar || ""} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {selectedAd.client ? getInitials(selectedAd.client.name) : "??"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {selectedAd.client?.name || "Cliente removido"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Campanha
                      </label>
                      <p className="text-sm font-medium">
                        {selectedAd.campaign?.name || (
                          <span className="text-muted-foreground italic">Não encontrado</span>
                        )}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Conjunto de Anúncios
                      </label>
                      <p className="text-sm font-medium">
                        {selectedAd.adset?.name || (
                          <span className="text-muted-foreground italic">Não encontrado</span>
                        )}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Data de Publicação
                      </label>
                      <p className="text-sm font-medium">
                        {format(new Date(selectedAd.published_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>

                    {selectedAd.quality_score && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Quality Score
                        </label>
                        <div>
                          <Badge
                            className={
                              selectedAd.quality_score >= 8
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : selectedAd.quality_score >= 6
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : ""
                            }
                          >
                            {selectedAd.quality_score.toFixed(1)}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {selectedAd.meta_ad_id && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Meta Ad ID
                        </label>
                        <p className="text-sm font-mono text-muted-foreground">
                          {selectedAd.meta_ad_id}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Legenda completa */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Legenda Completa
                    </label>
                    <div className="bg-muted/30 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">
                        {getAdText(selectedAd) || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
