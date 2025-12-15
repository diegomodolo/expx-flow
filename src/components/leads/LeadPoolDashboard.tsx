import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Users, Search, RefreshCw, TrendingUp, Star, MapPin, Phone, Mail } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const LeadPoolDashboard = () => {
  const { activeCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState("");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");

  const companyId = activeCompany?.company_id;

  const { data: stats } = useQuery({
    queryKey: ['lead-pool-stats', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { count: totalLeads } = await supabase
        .from('lead_master_pool')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      
      const { count: highScoreLeads } = await supabase
        .from('lead_master_pool')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('global_score', 70);
      
      const { count: convertedLeads } = await supabase
        .from('lead_master_pool')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gt('total_conversions', 0);
      
      const { data: valueData } = await supabase
        .from('lead_master_pool')
        .select('total_value')
        .eq('company_id', companyId);
      
      const totalValue = valueData?.reduce((sum, l) => sum + (l.total_value || 0), 0) || 0;
      
      return { totalLeads: totalLeads || 0, highScoreLeads: highScoreLeads || 0, convertedLeads: convertedLeads || 0, totalValue };
    },
    enabled: !!companyId
  });

  const { data: leads, isLoading } = useQuery({
    queryKey: ['lead-pool', companyId, searchTerm, scoreFilter, stateFilter],
    queryFn: async () => {
      if (!companyId) return [];
      
      let query = supabase
        .from('lead_master_pool')
        .select('*')
        .eq('company_id', companyId)
        .order('global_score', { ascending: false })
        .limit(100);
      
      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }
      
      if (scoreFilter === 'high') query = query.gte('global_score', 70);
      else if (scoreFilter === 'medium') query = query.gte('global_score', 40).lt('global_score', 70);
      else if (scoreFilter === 'low') query = query.lt('global_score', 40);
      
      if (stateFilter !== 'all') query = query.eq('state', stateFilter);
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  const { data: states } = useQuery({
    queryKey: ['lead-states', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('lead_master_pool').select('state').eq('company_id', companyId).not('state', 'is', null);
      return [...new Set(data?.map(l => l.state).filter(Boolean))].sort() as string[];
    },
    enabled: !!companyId
  });

  const getScoreBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Alto ({score})</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Médio ({score})</Badge>;
    return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Baixo ({score})</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total de Leads</p><p className="text-2xl font-bold">{stats?.totalLeads?.toLocaleString() || 0}</p></div><Users className="h-8 w-8 text-primary opacity-20" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Score Alto</p><p className="text-2xl font-bold">{stats?.highScoreLeads?.toLocaleString() || 0}</p></div><Star className="h-8 w-8 text-yellow-500 opacity-20" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Convertidos</p><p className="text-2xl font-bold">{stats?.convertedLeads?.toLocaleString() || 0}</p></div><TrendingUp className="h-8 w-8 text-green-500 opacity-20" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Valor Total</p><p className="text-2xl font-bold">R$ {stats?.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) || 0}</p></div><TrendingUp className="h-8 w-8 text-primary opacity-20" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Pool de Leads</CardTitle><CardDescription>Leads deduplicados de todos os clientes</CardDescription></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div>
            <Select value={scoreFilter} onValueChange={setScoreFilter}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Score" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="high">Alto</SelectItem><SelectItem value="medium">Médio</SelectItem><SelectItem value="low">Baixo</SelectItem></SelectContent></Select>
            <Select value={stateFilter} onValueChange={setStateFilter}><SelectTrigger className="w-[120px]"><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{states?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : leads && leads.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Lead</TableHead><TableHead>Contato</TableHead><TableHead>Local</TableHead><TableHead>Score</TableHead><TableHead>Conversões</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell><p className="font-medium">{lead.full_name || "Sem nome"}</p><p className="text-xs text-muted-foreground">Desde {format(new Date(lead.first_captured_at || lead.created_at), "dd/MM/yy", { locale: ptBR })}</p></TableCell>
                    <TableCell><div className="space-y-1">{lead.email && <div className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3" /><span className="truncate max-w-[120px]">{lead.email}</span></div>}{lead.phone && <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" /><span>{lead.phone}</span></div>}</div></TableCell>
                    <TableCell>{(lead.city || lead.state) && <div className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3" /><span>{[lead.city, lead.state].filter(Boolean).join(", ")}</span></div>}</TableCell>
                    <TableCell>{getScoreBadge(lead.global_score)}</TableCell>
                    <TableCell>{lead.total_conversions}</TableCell>
                    <TableCell>{lead.total_value > 0 ? `R$ ${lead.total_value.toLocaleString('pt-BR')}` : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-4 opacity-20" /><p>Nenhum lead encontrado</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
