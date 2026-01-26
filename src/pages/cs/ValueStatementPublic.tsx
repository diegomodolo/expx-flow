import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target, 
  CheckCircle2, 
  ArrowRight,
  Sparkles 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ValueStatementData {
  id: string;
  period_month: number;
  period_year: number;
  total_investment: number;
  total_return: number;
  leads_generated: number;
  conversions: number;
  executive_summary: string | null;
  next_month_plan: string | null;
  status: string;
  clients: {
    name: string;
    company: string;
  };
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function ValueStatementPublic() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ValueStatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!token) {
        setError("Token inválido");
        setLoading(false);
        return;
      }

      try {
        const { data: statement, error: fetchError } = await supabase
          .from('value_statements')
          .select(`
            id,
            period_month,
            period_year,
            total_investment,
            total_return,
            leads_generated,
            conversions,
            executive_summary,
            next_month_plan,
            status,
            clients (
              name,
              company
            )
          `)
          .eq('public_token', token)
          .single();

        if (fetchError) throw fetchError;

        setData(statement as ValueStatementData);
        setApproved(statement.status === 'approved');

        // Mark as viewed
        if (statement.status === 'sent') {
          await supabase
            .from('value_statements')
            .update({ 
              status: 'viewed', 
              viewed_at: new Date().toISOString() 
            })
            .eq('id', statement.id);
        }
      } catch (err) {
        console.error('Error fetching value statement:', err);
        setError("Comprovante não encontrado");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  const handleApprove = async () => {
    if (!data) return;

    try {
      await supabase
        .from('value_statements')
        .update({ 
          status: 'approved', 
          approved_at: new Date().toISOString() 
        })
        .eq('id', data.id);

      setApproved(true);
    } catch (err) {
      console.error('Error approving:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="animate-pulse text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-medium text-destructive mb-2">{error || "Erro desconhecido"}</p>
            <p className="text-muted-foreground">O comprovante solicitado não foi encontrado ou expirou.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roi = data.total_investment > 0 
    ? ((data.total_return - data.total_investment) / data.total_investment * 100).toFixed(1)
    : '0';
  const roiPositive = Number(roi) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            Comprovante de Valor
          </Badge>
          <h1 className="text-3xl font-bold mb-2">
            {monthNames[data.period_month - 1]} {data.period_year}
          </h1>
          <p className="text-primary-foreground/80">
            {data.clients?.company || data.clients?.name}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6 text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Investimento</p>
              <p className="text-2xl font-bold">
                R$ {data.total_investment.toLocaleString('pt-BR')}
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            "bg-gradient-to-br border",
            roiPositive 
              ? "from-green-500/10 to-green-500/5 border-green-500/20" 
              : "from-red-500/10 to-red-500/5 border-red-500/20"
          )}>
            <CardContent className="pt-6 text-center">
              <TrendingUp className={cn("h-8 w-8 mx-auto mb-2", roiPositive ? "text-green-500" : "text-red-500")} />
              <p className="text-sm text-muted-foreground">ROI</p>
              <p className={cn("text-2xl font-bold", roiPositive ? "text-green-500" : "text-red-500")}>
                {roi}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Leads</p>
              <p className="text-2xl font-bold">{data.leads_generated}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Conversões</p>
              <p className="text-2xl font-bold">{data.conversions}</p>
            </CardContent>
          </Card>
        </div>

        {/* Retorno Total */}
        <Card className="overflow-hidden">
          <div className={cn(
            "p-6 text-center",
            roiPositive ? "bg-green-500" : "bg-amber-500"
          )}>
            <p className="text-sm text-white/80 mb-1">Retorno Total</p>
            <p className="text-4xl font-bold text-white">
              R$ {data.total_return.toLocaleString('pt-BR')}
            </p>
          </div>
        </Card>

        {/* Executive Summary */}
        {data.executive_summary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📊 Resumo do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                {data.executive_summary}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Month Plan */}
        {data.next_month_plan && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎯 Plano do Próximo Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                {data.next_month_plan}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approval CTA */}
        <Card className="border-2 border-primary">
          <CardContent className="pt-6 text-center space-y-4">
            {approved ? (
              <>
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                <h3 className="text-xl font-bold text-green-500">Plano Aprovado!</h3>
                <p className="text-muted-foreground">
                  Obrigado pela confirmação. Estamos animados para o próximo mês!
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold">Aprovar Plano do Próximo Mês?</h3>
                <p className="text-muted-foreground">
                  Ao aprovar, confirma que está de acordo com a estratégia proposta.
                </p>
                <Button size="lg" className="w-full" onClick={handleApprove}>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Aprovar Plano
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-muted-foreground text-sm">
        <p>Gerado automaticamente • {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
