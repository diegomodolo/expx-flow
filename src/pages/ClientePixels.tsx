import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Star, StarOff, Send, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { useMetaPixels, MetaPixel, PixelEvent } from "@/hooks/useMetaPixels";
import { useCompany } from "@/contexts/CompanyContext";
import { SendEventModal } from "@/components/pixels/SendEventModal";
import { PixelEventsHistory } from "@/components/pixels/PixelEventsHistory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientePixels() {
  const { id: clientId } = useParams<{ id: string }>();
  const { activeCompany } = useCompany();
  const [selectedPixel, setSelectedPixel] = useState<MetaPixel | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  const {
    pixels,
    events,
    loading,
    syncing,
    fetchPixels,
    syncPixels,
    setPrimaryPixel,
    fetchEvents,
    sendEvent,
  } = useMetaPixels(clientId || "", activeCompany?.company_id || "");

  useEffect(() => {
    if (clientId && activeCompany?.company_id) {
      fetchPixels();
      fetchEvents();
    }
  }, [clientId, activeCompany?.company_id, fetchPixels, fetchEvents]);

  const handleSetPrimary = async (pixel: MetaPixel) => {
    await setPrimaryPixel(pixel.id);
  };

  const handleSendEvent = (pixel: MetaPixel) => {
    setSelectedPixel(pixel);
    setShowSendModal(true);
  };

  const primaryPixel = pixels.find((p) => p.is_primary);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Pixels Meta</h2>
          <p className="text-muted-foreground">
            Gerencie os pixels de conversão do cliente
          </p>
        </div>
        <Button onClick={syncPixels} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar Pixels"}
        </Button>
      </div>

      {/* No pixels message */}
      {!loading && pixels.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum pixel encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Clique em "Sincronizar Pixels" para buscar os pixels da conta de anúncios do cliente.
            </p>
            <Button onClick={syncPixels} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              Sincronizar Pixels
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pixels list */}
      {pixels.length > 0 && (
        <Tabs defaultValue="pixels" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pixels">Pixels ({pixels.length})</TabsTrigger>
            <TabsTrigger value="events">Histórico de Eventos</TabsTrigger>
          </TabsList>

          <TabsContent value="pixels" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pixels.map((pixel) => (
                <Card key={pixel.id} className={pixel.is_primary ? "border-primary" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {pixel.pixel_name}
                          {pixel.is_primary && (
                            <Badge variant="default" className="text-xs">
                              Principal
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="font-mono text-xs">
                          ID: {pixel.pixel_id}
                        </CardDescription>
                      </div>
                      {pixel.is_unavailable ? (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      {pixel.creation_time && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Criado em:</span>
                          <span>
                            {format(new Date(pixel.creation_time), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      )}
                      {pixel.last_fired_time && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Último evento:</span>
                          <span>
                            {format(new Date(pixel.last_fired_time), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      )}
                      {pixel.data_use_setting && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Uso de dados:</span>
                          <Badge variant="outline" className="text-xs">
                            {pixel.data_use_setting}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant={pixel.is_primary ? "secondary" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSetPrimary(pixel)}
                        disabled={pixel.is_primary}
                      >
                        {pixel.is_primary ? (
                          <>
                            <Star className="h-4 w-4 mr-1 fill-current" />
                            Principal
                          </>
                        ) : (
                          <>
                            <StarOff className="h-4 w-4 mr-1" />
                            Definir Principal
                          </>
                        )}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSendEvent(pixel)}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Enviar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="events">
            <PixelEventsHistory events={events} onRefresh={fetchEvents} />
          </TabsContent>
        </Tabs>
      )}

      {/* Send Event Modal */}
      <SendEventModal
        open={showSendModal}
        onOpenChange={setShowSendModal}
        pixel={selectedPixel}
        onSend={sendEvent}
      />
    </div>
  );
}
