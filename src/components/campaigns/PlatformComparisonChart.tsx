import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface PlatformMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  campaigns: number;
}

interface PlatformComparisonChartProps {
  meta: PlatformMetrics;
  google: PlatformMetrics;
}

export function PlatformComparisonChart({ meta, google }: PlatformComparisonChartProps) {
  const data = [
    {
      name: 'Investimento',
      Meta: meta.spend,
      Google: google.spend,
    },
    {
      name: 'Conversões',
      Meta: meta.conversions,
      Google: google.conversions,
    },
    {
      name: 'Cliques',
      Meta: meta.clicks,
      Google: google.clicks,
    },
    {
      name: 'Campanhas',
      Meta: meta.campaigns,
      Google: google.campaigns,
    },
  ];

  const metaCPA = meta.conversions > 0 ? meta.spend / meta.conversions : 0;
  const googleCPA = google.conversions > 0 ? google.spend / google.conversions : 0;
  const metaCTR = meta.impressions > 0 ? (meta.clicks / meta.impressions) * 100 : 0;
  const googleCTR = google.impressions > 0 ? (google.clicks / google.impressions) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Comparativo por Plataforma</CardTitle>
          <CardDescription>Meta Ads vs Google Ads</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Meta" fill="#1877F2" />
              <Bar dataKey="Google" fill="#4285F4" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Métricas de Eficiência</CardTitle>
          <CardDescription>Comparação de performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">CPA Médio</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#1877F2]">Meta:</span>
                  <span className="font-bold">R$ {metaCPA.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#4285F4]">Google:</span>
                  <span className="font-bold">R$ {googleCPA.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">CTR Médio</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#1877F2]">Meta:</span>
                  <span className="font-bold">{metaCTR.toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#4285F4]">Google:</span>
                  <span className="font-bold">{googleCTR.toFixed(2)}%</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-2">Investimento Total</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#1877F2]">Meta:</span>
                      <span className="font-medium">R$ {meta.spend.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#4285F4]">Google:</span>
                      <span className="font-medium">R$ {google.spend.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-2">Conversões Totais</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#1877F2]">Meta:</span>
                      <span className="font-medium">{meta.conversions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#4285F4]">Google:</span>
                      <span className="font-medium">{google.conversions}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
