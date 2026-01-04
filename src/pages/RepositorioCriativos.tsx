import React, { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAllCreatives, UnifiedCreative } from "@/hooks/useAllCreatives";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Images, Filter, Eye, Download, Calendar, User, Sparkles, Factory, Check, ChevronsUpDown, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function RepositorioCriativos() {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const { creatives, allClients, loading, loadingMore, hasMore, loadMore, totalCounts } = useAllCreatives(selectedClientId || undefined);
  const [selectedCreative, setSelectedCreative] = useState<UnifiedCreative | null>(null);

  const selectedClientName = useMemo(() => {
    if (!selectedClientId) return "Todos os clientes";
    const client = allClients.find(c => c.id === selectedClientId);
    return client?.name || "Todos os clientes";
  }, [selectedClientId, allClients]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "secondary" },
      approved: { label: "Aprovado", variant: "default" },
      rejected: { label: "Rejeitado", variant: "destructive" },
      completed: { label: "Concluído", variant: "default" },
      generating: { label: "Gerando", variant: "outline" },
      failed: { label: "Falhou", variant: "destructive" },
      error: { label: "Erro", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSourceBadge = (source: 'fabrica_criativos' | 'gerador_criativos' | 'fabrica_anuncios') => {
    if (source === 'fabrica_criativos') {
      return (
        <Badge variant="outline" className="gap-1 bg-primary/5">
          <Factory className="h-3 w-3" />
          Fábrica Criativos
        </Badge>
      );
    }
    if (source === 'fabrica_anuncios') {
      return (
        <Badge variant="outline" className="gap-1 bg-orange-500/10 text-orange-600 border-orange-500/30">
          <Megaphone className="h-3 w-3" />
          Fábrica Anúncios
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 bg-secondary/50">
        <Sparkles className="h-3 w-3" />
        Gerador
      </Badge>
    );
  };

  const handleDownload = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Images className="h-6 w-6 text-primary" />
              Repositório de Criativos
            </h1>
            <p className="text-muted-foreground mt-1">
              Todos os criativos gerados pela Fábrica de Criativos e Gerador de Criativos
            </p>
          </div>

          {/* Client Filter - Combobox with search */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-[250px] justify-between"
                >
                  <span className="truncate">{selectedClientName}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setSelectedClientId("");
                          setComboboxOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedClientId === "" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        Todos os clientes
                      </CommandItem>
                      {allClients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.name}
                          onSelect={() => {
                            setSelectedClientId(client.id);
                            setComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedClientId === client.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {client.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalCounts.total} criativos no total</span>
          <span>•</span>
          <span>{totalCounts.fabricaAnuncios} da Fábrica de Anúncios</span>
          <span>•</span>
          <span>{totalCounts.fabricaCriativos} da Fábrica de Criativos</span>
          <span>•</span>
          <span>{totalCounts.geradorCriativos} do Gerador</span>
          {creatives.length > 0 && (
            <>
              <span>•</span>
              <span className="text-primary font-medium">Mostrando {creatives.length}</span>
            </>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[3/4] w-full" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : creatives.length === 0 ? (
          <Card className="p-12 text-center">
            <Images className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Nenhum criativo encontrado</h3>
            <p className="text-muted-foreground mt-1">
              {selectedClientId 
                ? "Este cliente ainda não possui criativos gerados."
                : "Comece gerando criativos através da Fábrica ou Gerador de Criativos."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {creatives.map((creative) => (
              <Card 
                key={`${creative.source}-${creative.id}`} 
                className="overflow-hidden group hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedCreative(creative)}
              >
                {/* Image */}
                <div className="aspect-[3/4] relative bg-muted">
                  {creative.image_url ? (
                    <img
                      src={creative.image_url}
                      alt={creative.title || creative.caption || 'Criativo'}
                      className="w-full h-full object-cover"
                    />
                  ) : creative.video_url ? (
                    <video
                      src={creative.video_url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Images className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" size="sm" className="gap-1">
                      <Eye className="h-4 w-4" />
                      Ver
                    </Button>
                  </div>

                  {/* Source badge */}
                  <div className="absolute top-2 left-2">
                    {getSourceBadge(creative.source)}
                  </div>

                  {/* Status badge */}
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(creative.status)}
                  </div>
                </div>

                {/* Info */}
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="truncate">{creative.client_name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(creative.created_at), "dd MMM yyyy", { locale: ptBR })}</span>
                  </div>
                  {creative.theme && (
                    <p className="text-xs text-muted-foreground truncate">{creative.theme}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!loading && creatives.length > 0 && hasMore && (
          <div className="flex justify-center pt-4">
            <Button 
              variant="outline" 
              onClick={loadMore} 
              disabled={loadingMore}
              className="min-w-[200px]"
            >
              {loadingMore ? "Carregando..." : "Carregar mais"}
            </Button>
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={!!selectedCreative} onOpenChange={() => setSelectedCreative(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedCreative?.title || "Detalhes do Criativo"}
                {selectedCreative && getSourceBadge(selectedCreative.source)}
              </DialogTitle>
            </DialogHeader>

            {selectedCreative && (
              <div className="space-y-4">
                {/* Image/Video */}
                <div className="rounded-lg overflow-hidden bg-muted">
                  {selectedCreative.image_url ? (
                    <img
                      src={selectedCreative.image_url}
                      alt={selectedCreative.title || 'Criativo'}
                      className="w-full max-h-[60vh] object-contain"
                    />
                  ) : selectedCreative.video_url ? (
                    <video
                      src={selectedCreative.video_url}
                      controls
                      className="w-full max-h-[60vh]"
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center">
                      <Images className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Cliente</p>
                    <p className="text-sm text-muted-foreground">{selectedCreative.client_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Data de Criação</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedCreative.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedCreative.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Origem</p>
                    <div className="mt-1">{getSourceBadge(selectedCreative.source)}</div>
                  </div>
                  {selectedCreative.creative_type && (
                    <div>
                      <p className="text-sm font-medium">Tipo</p>
                      <p className="text-sm text-muted-foreground">{selectedCreative.creative_type}</p>
                    </div>
                  )}
                  {selectedCreative.theme && (
                    <div>
                      <p className="text-sm font-medium">Tema</p>
                      <p className="text-sm text-muted-foreground">{selectedCreative.theme}</p>
                    </div>
                  )}
                </div>

                {/* Caption */}
                {selectedCreative.caption && (
                  <div>
                    <p className="text-sm font-medium mb-1">Legenda</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                      {selectedCreative.caption}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  {selectedCreative.image_url && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleDownload(
                        selectedCreative.image_url!, 
                        `criativo-${selectedCreative.id}.jpg`
                      )}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Imagem
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setSelectedCreative(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}