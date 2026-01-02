import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingAd {
  id: string;
  generation_type: 'clone' | 'concept' | 'iteration';
  generated_at: string;
  quality_score: number | null;
  generated_content: {
    headline?: string;
  };
  clients?: {
    name: string;
  };
}

export function PendingAdsNotification() {
  const { activeCompany } = useCompany();
  const navigate = useNavigate();

  const { data: pendingAds } = useQuery({
    queryKey: ['pending-ads-notification', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      const { data, error } = await supabase
        .from('ad_generation_queue')
        .select(`
          id,
          generation_type,
          generated_at,
          quality_score,
          generated_content,
          clients (name)
        `)
        .eq('company_id', activeCompany.company_id)
        .eq('status', 'pending')
        .order('generated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as PendingAd[];
    },
    enabled: !!activeCompany?.company_id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const pendingCount = pendingAds?.length || 0;

  const typeLabels = {
    clone: 'Clone',
    concept: 'Conceito',
    iteration: 'Iteração',
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {pendingCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {pendingCount > 9 ? '9+' : pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h4 className="font-semibold">Anúncios Pendentes</h4>
          <p className="text-sm text-muted-foreground">
            {pendingCount} anúncio(s) aguardando revisão
          </p>
        </div>

        <ScrollArea className="h-[300px]">
          {!pendingAds?.length ? (
            <div className="p-4 text-center text-muted-foreground">
              Nenhum anúncio pendente
            </div>
          ) : (
            <div className="divide-y">
              {pendingAds.map((ad) => {
                const content = ad.generated_content as { headline?: string };
                return (
                  <div
                    key={ad.id}
                    className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate('/geradores/fila-revisao')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {content?.headline || 'Anúncio sem título'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ad.clients?.name} • {typeLabels[ad.generation_type]}
                        </p>
                      </div>
                      {ad.quality_score && (
                        <Badge variant="outline" className="text-xs">
                          {ad.quality_score}/10
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(ad.generated_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {pendingCount > 0 && (
          <div className="p-2 border-t">
            <Button 
              variant="ghost" 
              className="w-full text-sm"
              onClick={() => navigate('/geradores/fila-revisao')}
            >
              Ver todos os pendentes
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
