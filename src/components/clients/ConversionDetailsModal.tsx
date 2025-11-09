import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConversionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversion: {
    id: string;
    event_name: string;
    created_at: string;
    webhook_payload?: any;
    meta_response: any;
  };
}

export function ConversionDetailsModal({ isOpen, onClose, conversion }: ConversionDetailsModalProps) {
  const { toast } = useToast();

  const copyToClipboard = (data: any) => {
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString);
    toast({
      title: "JSON copiado!",
      description: "O JSON foi copiado para a área de transferência.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Detalhes da Conversão</DialogTitle>
          <DialogDescription>
            {conversion.event_name} - {format(new Date(conversion.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> Este JSON contém dados sensíveis do cliente. Não compartilhe estas informações com terceiros.
          </AlertDescription>
        </Alert>
        
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received">
              📥 JSON Recebido
            </TabsTrigger>
            <TabsTrigger value="response">
              📤 JSON de Resposta (Meta)
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="received" className="mt-4">
            {conversion.webhook_payload ? (
              <>
                <ScrollArea className="h-[450px] w-full rounded-md border p-4 bg-muted/30">
                  <pre className="text-xs font-mono">
                    <code>{JSON.stringify(conversion.webhook_payload, null, 2)}</code>
                  </pre>
                </ScrollArea>
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(conversion.webhook_payload)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar JSON
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-[450px] flex items-center justify-center border rounded-md bg-muted/10">
                <p className="text-muted-foreground">Payload original não disponível</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="response" className="mt-4">
            {conversion.meta_response ? (
              <>
                <ScrollArea className="h-[450px] w-full rounded-md border p-4 bg-muted/30">
                  <pre className="text-xs font-mono">
                    <code>{JSON.stringify(conversion.meta_response, null, 2)}</code>
                  </pre>
                </ScrollArea>
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(conversion.meta_response)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar JSON
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-[450px] flex items-center justify-center border rounded-md bg-muted/10">
                <p className="text-muted-foreground">Resposta do Meta não disponível</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
