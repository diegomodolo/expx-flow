import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

interface FeaturedCampaign {
  id: string;
  name: string;
  client_name: string;
  cpa: number | null;
  conversions: number;
  trend: 'up' | 'down' | 'stable';
}

export const FeaturedCampaignsCard = () => {
  const { activeCompany } = useCompany();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['featured-campaigns', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          cpa,
          conversions,
          status,
          clients!inner(name)
        `)
        .eq('company_id', activeCompany.company_id)
        .eq('status', 'active')
        .gt('conversions', 0)
        .order('conversions', { ascending: false })
        .limit(4);

      if (error) throw error;

      return (data || []).map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        client_name: (campaign.clients as any)?.name || 'Cliente',
        cpa: campaign.cpa,
        conversions: campaign.conversions,
        // Simulate trend based on CPA (could be enhanced with historical data)
        trend: campaign.cpa && campaign.cpa < 30 ? 'up' : campaign.cpa && campaign.cpa > 50 ? 'down' : 'stable'
      })) as FeaturedCampaign[];
    },
    enabled: !!activeCompany?.company_id
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Campanhas em Destaque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Campanhas em Destaque
        </CardTitle>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma campanha ativa</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign, index) => (
              <div
                key={campaign.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{campaign.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {campaign.client_name}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {campaign.conversions} leads
                    </p>
                    {campaign.cpa && (
                      <p className="text-xs text-muted-foreground">
                        CPA R$ {campaign.cpa.toFixed(2)}
                      </p>
                    )}
                  </div>
                  
                  {campaign.trend === 'up' && (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                  {campaign.trend === 'down' && (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
