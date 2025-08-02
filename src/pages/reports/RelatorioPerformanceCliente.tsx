import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useClients } from "@/hooks/useClients";

const RelatorioPerformanceCliente = () => {
  const { clientsPerformance } = useDashboardData();
  const { clients } = useClients();

  const chartConfig = {
    investment: { label: "Investimento", color: "hsl(var(--primary))" },
    leads: { label: "Leads", color: "hsl(var(--secondary))" },
    cpa: { label: "CPA", color: "hsl(var(--accent))" }
  };

  const totalInvestment = clientsPerformance.reduce((acc, client) => acc + client.investment, 0);
  const totalLeads = clientsPerformance.reduce((acc, client) => acc + (client.investment / 50 || 0), 0); // Simular leads
  const avgCPA = totalInvestment / totalLeads || 0;

  const topPerformers = clientsPerformance
    .sort((a, b) => b.investment - a.investment)
    .slice(0, 5);

  const bottomPerformers = clientsPerformance
    .sort((a, b) => a.investment - b.investment)
    .slice(0, 3);

  return (
    <ReportLayout
      title="Relatório de Performance por Cliente"
      description="Análise detalhada do desempenho de cada cliente"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Clientes Ativos"
          value={clients.length}
        />
        <MetricCard
          title="Investimento Total"
          value={`R$ ${totalInvestment.toLocaleString()}`}
          trend="up"
        />
        <MetricCard
          title="Leads Totais"
          value={totalLeads.toLocaleString()}
          trend="up"
        />
        <MetricCard
          title="CPA Médio"
          value={`R$ ${avgCPA.toFixed(2)}`}
          trend="down"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Investimento por Cliente</CardTitle>
            <CardDescription>Distribuição do investimento mensal</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clientsPerformance.slice(0, 8)}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="investment" fill="var(--color-investment)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CPA por Cliente</CardTitle>
            <CardDescription>Custo por aquisição comparativo</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={clientsPerformance.slice(0, 8)}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="cpa" 
                    stroke="var(--color-cpa)" 
                    strokeWidth={2}
                    dot={{ fill: "var(--color-cpa)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Clientes com melhor ROI (leads/investimento)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((client, index) => {
                const simulatedLeads = Math.floor(client.investment / 50);
                const efficiency = client.investment > 0 ? (simulatedLeads / client.investment * 1000).toFixed(1) : '0';
                
                return (
                  <div key={client.name} className="flex justify-between items-center p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {simulatedLeads} leads • R$ {client.investment.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{efficiency}</p>
                      <p className="text-xs text-muted-foreground">leads/k</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clientes Prioritários</CardTitle>
            <CardDescription>Requerem atenção para otimização</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bottomPerformers.map((client, index) => {
                const simulatedLeads = Math.floor(client.investment / 80);
                const efficiency = client.investment > 0 ? (simulatedLeads / client.investment * 1000).toFixed(1) : '0';
                
                return (
                  <div key={client.name} className="flex justify-between items-center p-3 border rounded-lg border-red-200">
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {simulatedLeads} leads • R$ {client.investment.toLocaleString()}
                      </p>
                      <p className="text-xs text-red-600">
                        ROI baixo
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">{efficiency}</p>
                      <p className="text-xs text-muted-foreground">leads/k</p>
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
          <CardTitle>Resumo Detalhado por Cliente</CardTitle>
          <CardDescription>Performance completa de todos os clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Cliente</th>
                  <th className="text-right p-3 font-medium">Investimento</th>
                  <th className="text-right p-3 font-medium">Leads</th>
                  <th className="text-right p-3 font-medium">CPA</th>
                  <th className="text-right p-3 font-medium">Eficiência</th>
                  <th className="text-right p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {clientsPerformance.map((client) => {
                  const simulatedLeads = Math.floor(client.investment / 60);
                  const simulatedCPA = client.investment / simulatedLeads || 0;
                  const efficiency = client.investment > 0 ? (simulatedLeads / client.investment * 1000).toFixed(1) : '0';
                  const status = parseFloat(efficiency) > 15 ? 'Excelente' : 
                                parseFloat(efficiency) > 10 ? 'Bom' :
                                parseFloat(efficiency) > 5 ? 'Regular' : 'Crítico';
                  const statusColor = parseFloat(efficiency) > 15 ? 'text-green-600' : 
                                     parseFloat(efficiency) > 10 ? 'text-blue-600' :
                                     parseFloat(efficiency) > 5 ? 'text-yellow-600' : 'text-red-600';
                  
                  return (
                    <tr key={client.name} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{client.name}</td>
                      <td className="p-3 text-right">R$ {client.investment.toLocaleString()}</td>
                      <td className="p-3 text-right">{simulatedLeads}</td>
                      <td className="p-3 text-right">R$ {simulatedCPA.toFixed(2)}</td>
                      <td className="p-3 text-right">{efficiency}</td>
                      <td className={`p-3 text-right font-medium ${statusColor}`}>{status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </ReportLayout>
  );
};

export default RelatorioPerformanceCliente;