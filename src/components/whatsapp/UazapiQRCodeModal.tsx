import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UazapiQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  instanceName: string;
}

export function UazapiQRCodeModal({
  isOpen,
  onClose,
  instanceId,
  instanceName,
}: UazapiQRCodeModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchQRCode = useCallback(async () => {
    if (!instanceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-uazapi-qrcode", {
        body: { instance_id: instanceId },
      });

      if (fnError) throw fnError;

      if (data.is_connected) {
        setIsConnected(true);
        setConnectedPhone(data.connected_phone);
        setProfileName(data.profile_name);
        setQrCode(null);
        setPairCode(null);
        toast({
          title: "WhatsApp já conectado!",
          description: data.profile_name || data.connected_phone || "Sessão ativa.",
        });
        return;
      }

      if (data.success && data.qrcode) {
        setQrCode(data.qrcode);
        setPairCode(data.paircode || null);
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
  }, [instanceId, toast]);

  const checkConnection = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke("test-uazapi-connection", {
        body: { instance_id: instanceId },
      });

      if (data?.is_connected) {
        setIsConnected(true);
        setConnectedPhone(data.connected_phone);
        setProfileName(data.profile_name);
        setQrCode(null);
        setPairCode(null);
        toast({
          title: "WhatsApp conectado!",
          description: data.profile_name || data.connected_phone || "Conexão estabelecida.",
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error checking connection:", err);
      return false;
    }
  }, [instanceId, toast]);

  // Fetch QR code when modal opens
  useEffect(() => {
    if (isOpen && !isConnected) {
      fetchQRCode();
    }
  }, [isOpen, isConnected, fetchQRCode]);

  // Auto-refresh QR code every 30 seconds
  useEffect(() => {
    if (!isOpen || isConnected || !qrCode) return;

    const interval = setInterval(() => {
      fetchQRCode();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen, isConnected, qrCode, fetchQRCode]);

  // Check connection status every 5 seconds
  useEffect(() => {
    if (!isOpen || isConnected || !qrCode) return;

    const interval = setInterval(async () => {
      const connected = await checkConnection();
      if (connected) {
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, isConnected, qrCode, checkConnection]);

  const copyPairCode = () => {
    if (pairCode) {
      navigator.clipboard.writeText(pairCode);
      toast({ title: "Código copiado!" });
    }
  };

  const handleClose = () => {
    setQrCode(null);
    setPairCode(null);
    setIsConnected(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            {instanceName} - Escaneie o QR Code ou use o código de pareamento
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
              <div className="text-center">
                <p className="text-lg font-medium text-google-green-700 dark:text-google-green-400">
                  WhatsApp Conectado!
                </p>
                {profileName && (
                  <p className="text-sm text-muted-foreground mt-1">{profileName}</p>
                )}
                {connectedPhone && (
                  <p className="text-sm text-muted-foreground">📱 {connectedPhone}</p>
                )}
              </div>
              <Button onClick={handleClose}>Fechar</Button>
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
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <img
                  src={qrCode}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 object-contain"
                />
              </div>
              
              {pairCode && (
                <div className="flex flex-col items-center gap-2 mt-2">
                  <p className="text-sm text-muted-foreground">Ou use o código de pareamento:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-3 py-1.5 rounded text-lg font-mono">
                      {pairCode}
                    </code>
                    <Button variant="ghost" size="icon" onClick={copyPairCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground text-center max-w-xs">
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
