import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Phone, 
  MoreVertical, 
  QrCode, 
  Wifi, 
  Users, 
  Pencil, 
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  WifiOff,
  Webhook,
} from "lucide-react";
import { WhatsAppInstance } from "@/hooks/useWhatsAppInstances";
import { UazapiQRCodeModal } from "./UazapiQRCodeModal";

interface WhatsAppInstanceCardProps {
  instance: WhatsAppInstance;
  baseEndpoint: string;
  baseToken: string;
  onEdit: (instance: WhatsAppInstance) => void;
  onManageUsers: (instance: WhatsAppInstance) => void;
  onTestConnection: (instanceId: string) => void;
  onConfigureWebhook: (instanceId: string) => void;
  onDelete: (instanceId: string) => void;
  isTesting: boolean;
  isConfiguringWebhook: boolean;
}

export function WhatsAppInstanceCard({
  instance,
  baseEndpoint,
  baseToken,
  onEdit,
  onManageUsers,
  onTestConnection,
  onConfigureWebhook,
  onDelete,
  isTesting,
  isConfiguringWebhook,
}: WhatsAppInstanceCardProps) {
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatusBadge = () => {
    const status = instance.status || (instance.is_connected ? "connected" : "disconnected");
    
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-google-green-100 text-google-green-700 dark:bg-google-green-600/20 dark:text-google-green-400 shrink-0">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Conectado
          </Badge>
        );
      case "connecting":
        return (
          <Badge variant="secondary" className="bg-google-blue-100 text-google-blue-700 dark:bg-google-blue-600/20 dark:text-google-blue-400 shrink-0">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Conectando...
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-google-yellow-100 text-google-yellow-700 dark:bg-google-yellow-600/20 dark:text-google-yellow-400 shrink-0">
            <WifiOff className="h-3 w-3 mr-1" />
            Desconectado
          </Badge>
        );
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {instance.profile_pic_url ? (
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={instance.profile_pic_url} alt={instance.profile_name || instance.instance_name} />
                  <AvatarFallback>
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium truncate">{instance.instance_name}</h3>
                  {getStatusBadge()}
                </div>
                
                {instance.profile_name && (
                  <p className="text-sm font-medium text-primary mt-0.5">
                    {instance.profile_name}
                  </p>
                )}
                
                {instance.connected_phone && (
                  <p className="text-sm text-muted-foreground">
                    📱 {instance.connected_phone}
                  </p>
                )}

                {instance.uazapi_instance_id && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ID: {instance.uazapi_instance_id}
                  </p>
                )}
                
                {instance.last_connection_test && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Última verificação: {new Date(instance.last_connection_test).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQRModal(true)}
                disabled={instance.is_connected}
              >
                <QrCode className="h-4 w-4 mr-1" />
                QR Code
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTestConnection(instance.id)}
                disabled={isTesting}
                title="Testar conexão"
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onConfigureWebhook(instance.id)}
                disabled={isConfiguringWebhook}
                title="Configurar Webhook"
              >
                {isConfiguringWebhook ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Webhook className="h-4 w-4" />
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onManageUsers(instance)}>
                    <Users className="h-4 w-4 mr-2" />
                    Gerenciar Usuários
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(instance)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <UazapiQRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        instanceId={instance.id}
        instanceName={instance.instance_name}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir instância?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a instância "{instance.instance_name}" e todas as suas atribuições de usuários.
              A instância também será removida da UazapiGO.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(instance.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
