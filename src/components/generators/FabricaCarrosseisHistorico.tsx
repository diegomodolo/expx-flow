import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Layers, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  clientId: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  published: "bg-violet-100 text-violet-700",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  published: "Publicado",
};

export function FabricaCarrosseisHistorico({ clientId }: Props) {
  const { activeCompany } = useCompany();

  const { data: history, isLoading } = useQuery({
    queryKey: ['carousel-client-history', clientId, activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id || !clientId) return [];

      const { data, error } = await supabase
        .from('carousel_generation_queue')
        .select('id, carousel_type, theme, status, generated_at, reviewed_at')
        .eq('client_id', clientId)
        .eq('company_id', activeCompany.company_id)
        .order('generated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.company_id && !!clientId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Layers className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum histórico</h3>
          <p className="text-muted-foreground text-center mt-2">
            O histórico de gerações aparecerá aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4">Histórico de Gerações</h3>
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">{item.theme || 'Sem tema'}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.generated_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <Badge className={statusColors[item.status]}>
                {statusLabels[item.status]}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
