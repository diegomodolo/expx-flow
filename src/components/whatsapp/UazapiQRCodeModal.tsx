import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UazapiQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoint: string;
  token: string;
  session: string;
}

export function UazapiQRCodeModal({
  isOpen,
  onClose,
  endpoint,
  token,
  session,
}: UazapiQRCodeModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchQRCode = async () => {
    if (!endpoint || !token || !session) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-uazapi-qrcode", {
        body: { endpoint, token, session },
      });

      if (fnError) throw fnError;

      if (data.is_connected) {
        setIsConnected(true);
        setQrCode(null);
        toast({
          title: "WhatsApp já conectado!",
          description: "Sua sessão já está ativa.",
        });
        return;
      }

      if (data.success && data.qrcode) {
        setQrCode(data.qrcode);
        setIsConnected(false);
      } else {
        throw new Error(data.error || "Erro ao obter QR Code");
      }
    } catch (err: any) {
      console.error("Error fetching QR code:", err);
      setError(err.message || "Erro ao obter QR Code");
      toast({
        title: "Erro ao obter QR Code",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh QR code every 30 seconds
  useEffect(() => {
    if (isOpen && !isConnected) {
      fetchQRCode();

      const interval = setInterval(() => {
        if (!isConnected) {
          fetchQRCode();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isOpen, endpoint, token, session]);

  // Check connection status every 5 seconds
  useEffect(() => {
    if (isOpen && qrCode && !isConnected) {
      const checkInterval = setInterval(async () => {
        try {
          const { data } = await supabase.functions.invoke("test-uazapi-connection", {
            body: { endpoint, token, session },
          });

          if (data?.is_connected) {
            setIsConnected(true);
            setQrCode(null);
            toast({
              title: "WhatsApp conectado!",
              description: data.connected_phone 
                ? `Número: ${data.connected_phone}` 
                : "Conexão estabelecida com sucesso.",
            });
          }
        } catch (err) {
          console.error("Error checking connection:", err);
        }
      }, 5000);

      return () => clearInterval(checkInterval);
    }
  }, [isOpen, qrCode, isConnected]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp para conectar
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Carregando QR Code...</p>
            </div>
          ) : isConnected ? (
            <div className="flex flex-col items-center gap-4">
              <div className="h-24 w-24 rounded-full bg-google-green-100 dark:bg-google-green-600/20 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-google-green-600 dark:text-google-green-400" />
              </div>
              <p className="text-lg font-medium text-google-green-700 dark:text-google-green-400">
                WhatsApp Conectado!
              </p>
              <Button onClick={onClose}>Fechar</Button>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-destructive text-center">{error}</p>
              <Button onClick={fetchQRCode} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-lg">
                <img
                  src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 object-contain"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Abra o WhatsApp no seu celular, vá em <strong>Dispositivos conectados</strong> e escaneie este QR Code
              </p>
              <Button onClick={fetchQRCode} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar QR Code
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">Nenhum QR Code disponível</p>
              <Button onClick={fetchQRCode} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Gerar QR Code
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
