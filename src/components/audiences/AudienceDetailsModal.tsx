import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MetaAudience } from "@/hooks/useMetaAudiences";
import { Loader2, Users, CheckCircle, XCircle, Clock } from "lucide-react";

interface AudienceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audience: MetaAudience | null;
  onFetchDetails: (audienceId: string) => Promise<MetaAudience | null>;
}

export function AudienceDetailsModal({
  open,
  onOpenChange,
  audience,
  onFetchDetails,
}: AudienceDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<MetaAudience | null>(null);

  useEffect(() => {
    if (open && audience) {
      setLoading(true);
      onFetchDetails(audience.id)
        .then((data) => {
          setDetails(data);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setDetails(null);
    }
  }, [open, audience, onFetchDetails]);

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getOperationStatusIcon = (status?: any) => {
    if (!status) return null;

    const statusCode = status.code || status;
    switch (statusCode) {
      case 200:
      case "NORMAL":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 400:
      case "PENDING":
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getOperationStatusLabel = (status?: any) => {
    if (!status) return "Desconhecido";

    const statusCode = status.code || status;
    switch (statusCode) {
      case 200:
      case "NORMAL":
        return "Operacional";
      case 400:
      case "PENDING":
        return "Processando";
      default:
        return status.description || "Erro";
    }
  };

  const displayData = details || audience;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Detalhes do Público</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Carregando detalhes...</p>
          </div>
        ) : displayData ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{displayData.name}</h3>
                {displayData.description && (
                  <p className="text-sm text-muted-foreground">{displayData.description}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Tamanho Aproximado</p>
                <p className="text-2xl font-bold">{formatCount(displayData.approximate_count)}</p>
                <p className="text-xs text-muted-foreground">usuários</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Tipo</p>
                <Badge variant="secondary" className="mt-1">
                  {displayData.subtype || "CUSTOM"}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">ID do Público</span>
                <span className="font-mono text-sm">{displayData.id}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Status da Operação</span>
                <div className="flex items-center gap-2">
                  {getOperationStatusIcon(displayData.operation_status)}
                  <span>{getOperationStatusLabel(displayData.operation_status)}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-sm">
              <p className="text-muted-foreground">
                O tamanho do público é aproximado e pode levar até 24 horas para refletir
                as alterações mais recentes.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
