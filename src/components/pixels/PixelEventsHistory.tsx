import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { PixelEvent } from "@/hooks/useMetaPixels";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface PixelEventsHistoryProps {
  events: PixelEvent[];
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: {
    label: "Enviado",
    icon: <CheckCircle2 className="h-3 w-3" />,
    variant: "default",
  },
  pending: {
    label: "Pendente",
    icon: <Clock className="h-3 w-3" />,
    variant: "secondary",
  },
  error: {
    label: "Erro",
    icon: <XCircle className="h-3 w-3" />,
    variant: "destructive",
  },
};

const eventLabels: Record<string, string> = {
  Lead: "Lead",
  Purchase: "Compra",
  AddToCart: "Carrinho",
  InitiateCheckout: "Checkout",
  CompleteRegistration: "Registro",
  Contact: "Contato",
  Schedule: "Agendamento",
  ViewContent: "Visualização",
  Search: "Pesquisa",
  AddPaymentInfo: "Pagamento",
  Subscribe: "Assinatura",
  StartTrial: "Trial",
};

export function PixelEventsHistory({ events, onRefresh }: PixelEventsHistoryProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Histórico de Eventos</CardTitle>
            <CardDescription>
              Eventos enviados via Conversions API
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum evento enviado ainda
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const status = statusConfig[event.status] || statusConfig.pending;
                const isExpanded = expandedRows.has(event.id);

                return (
                  <>
                    <TableRow
                      key={event.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRow(event.id)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {eventLabels[event.event_name] || event.event_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {event.action_source.replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="gap-1">
                          {status.icon}
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${event.id}-details`}>
                        <TableCell colSpan={5} className="bg-muted/30">
                          <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Event ID:</span>
                                <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                                  {event.event_id}
                                </code>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Event Time:</span>
                                <span className="ml-2">
                                  {format(new Date(event.event_time), "dd/MM/yyyy HH:mm:ss", {
                                    locale: ptBR,
                                  })}
                                </span>
                              </div>
                            </div>

                            {event.user_data && Object.keys(event.user_data).length > 0 && (
                              <div>
                                <span className="text-sm text-muted-foreground">User Data (hashed):</span>
                                <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                                  {JSON.stringify(event.user_data, null, 2)}
                                </pre>
                              </div>
                            )}

                            {event.custom_data && Object.keys(event.custom_data).length > 0 && (
                              <div>
                                <span className="text-sm text-muted-foreground">Custom Data:</span>
                                <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                                  {JSON.stringify(event.custom_data, null, 2)}
                                </pre>
                              </div>
                            )}

                            {event.error_message && (
                              <div className="text-destructive text-sm">
                                <span className="font-medium">Erro:</span> {event.error_message}
                              </div>
                            )}

                            {event.meta_response && (
                              <div>
                                <span className="text-sm text-muted-foreground">Meta Response:</span>
                                <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                                  {JSON.stringify(event.meta_response, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
