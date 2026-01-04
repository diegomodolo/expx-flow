import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket, Eye, X } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
        // Primeiro buscar os anúncios publicados
        const { data: adsData, error: adsError } = await supabase
          .from("ad_generation_queue")
          .select(`
            id,
            published_at,
            generated_content,
            quality_score,
            meta_ad_id,
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

        // Buscar informações de campanha e conjunto através do meta_ad_id
        const formattedData: PublishedAd[] = [];

        for (const item of adsData || []) {
          let campaign = null;
          let adset = null;

          // Se tiver meta_ad_id, buscar os dados do anúncio no Meta
          if (item.meta_ad_id) {
            const { data: adData } = await supabase
              .from("ads")
              .select(`
                campaign_id,
                ad_set_id,
                campaigns:campaign_id (id, name),
                ad_sets:ad_set_id (id, name)
              `)
              .eq("facebook_id", item.meta_ad_id)
              .single();

            if (adData) {
              campaign = adData.campaigns as any;
              adset = adData.ad_sets as any;
            }
          }

          formattedData.push({
            id: item.id,
            published_at: item.published_at,
            generated_content: item.generated_content as PublishedAd["generated_content"],
            quality_score: item.quality_score,
            meta_ad_id: item.meta_ad_id,
            client: item.clients as any,
            campaign,
            adset,
          });
        }

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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview do Criativo
            </DialogTitle>
          </DialogHeader>

          {selectedAd && (
            <div className="space-y-6">
              {/* Imagem do criativo */}
              {selectedAd.generated_content?.image_url && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={selectedAd.generated_content.image_url}
                    alt="Creative preview"
                    className="w-full h-auto max-h-[300px] object-contain bg-muted"
                  />
                </div>
              )}

              {/* Conteúdo do criativo */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Headline
                  </label>
                  <p className="mt-1 text-base font-semibold">
                    {selectedAd.generated_content?.headline || "-"}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Texto Principal
                  </label>
                  <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                    {selectedAd.generated_content?.primary_text || "-"}
                  </p>
                </div>

                {selectedAd.generated_content?.description && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Descrição
                    </label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedAd.generated_content.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Informações de publicação */}
              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="font-medium text-sm">Detalhes da Publicação</h4>
                
                <div className="grid grid-cols-2 gap-4">
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
                      Data de Publicação
                    </label>
                    <p className="text-sm font-medium">
                      {format(new Date(selectedAd.published_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Campanha
                    </label>
                    <p className="text-sm font-medium">
                      {selectedAd.campaign?.name || (
                        <span className="text-muted-foreground italic">Não vinculado</span>
                      )}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Conjunto de Anúncios
                    </label>
                    <p className="text-sm font-medium">
                      {selectedAd.adset?.name || (
                        <span className="text-muted-foreground italic">Não vinculado</span>
                      )}
                    </p>
                  </div>

                  {selectedAd.quality_score && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Quality Score
                      </label>
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
