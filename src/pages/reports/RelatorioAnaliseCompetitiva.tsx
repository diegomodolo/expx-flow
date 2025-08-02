import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { useCompetitors } from "@/hooks/useCompetitors";
import { useAuth } from "@/hooks/useAuth";
import { useCompanies } from "@/hooks/useCompanies";

const RelatorioAnaliseCompetitiva = () => {
  const { user } = useAuth();
  const { activeCompany } = useCompanies();
  const { competitors, competitorAds } = useCompetitors("all");

  return (
    <ReportLayout
      title="Relatório de Análise Competitiva"
      description="Monitoramento e insights da concorrência"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Concorrentes Monitorados"
          value={competitors.length}
        />
        <MetricCard
          title="Anúncios Coletados"
          value={competitorAds.length}
        />
        <MetricCard
          title="Novos Anúncios (7d)"
          value={competitorAds.filter(ad => {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return new Date(ad.date_spotted) >= sevenDaysAgo;
          }).length}
          trend="up"
        />
        <MetricCard
          title="Anúncios Ativos"
          value={competitorAds.filter(ad => ad.is_active).length}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Concorrentes por Atividade</CardTitle>
            <CardDescription>Baseado no número de anúncios ativos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {competitors.slice(0, 5).map((competitor, index) => {
                const adsCount = competitorAds.filter(ad => 
                  ad.competitor_id === competitor.id && ad.is_active
                ).length;
                
                return (
                  <div key={competitor.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{competitor.name}</p>
                      <p className="text-sm text-muted-foreground">{competitor.industry}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{adsCount}</p>
                      <p className="text-xs text-muted-foreground">anúncios ativos</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Análise de Criativos</CardTitle>
            <CardDescription>Tipos de anúncios mais utilizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Video', 'Image', 'Carousel', 'Collection'].map((type) => {
                const count = competitorAds.filter(ad => ad.ad_type === type).length;
                const percentage = competitorAds.length > 0 ? (count / competitorAds.length * 100).toFixed(1) : 0;
                
                return (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anúncios Recentes da Concorrência</CardTitle>
          <CardDescription>Últimos anúncios coletados para análise</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {competitorAds.slice(0, 10).map((ad) => {
              const competitor = competitors.find(c => c.id === ad.competitor_id);
              return (
                <div key={ad.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{ad.ad_title}</h4>
                      <p className="text-sm text-muted-foreground">{competitor?.name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ad.date_spotted).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{ad.ad_description}</p>
                  {ad.call_to_action && (
                    <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                      {ad.call_to_action}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </ReportLayout>
  );
};

export default RelatorioAnaliseCompetitiva;