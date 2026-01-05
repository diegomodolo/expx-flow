import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { 
  Wallet, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  ArrowLeft,
  TrendingDown,
  Calendar,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/crmReportUtils";

interface ClientePrepago {
  id: string;
  name: string;
  company: string;
  balance: number;
  rechargeDay: number | null;
  dailySpend: number;
  daysRemaining: number;
  nextRechargeDate: Date | null;
  daysUntilRecharge: number;
  status: 'suficiente' | 'apertado' | 'insuficiente';
}

const RelatorioSaldoPrePagos = () => {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("daysRemaining");

  // Buscar clientes pré-pagos com seus saldos e gastos
  const { data: clientesPrePagos, isLoading } = useQuery({
    queryKey: ['clientes-prepagos', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      // Buscar clientes com contas pré-pagas
      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          company,
          meta_payment_type,
          meta_recharge_day,
          facebook_ad_accounts(
            balance,
            is_prepaid,
            recharge_day
          )
        `)
        .eq('company_id', activeCompany.company_id)
        .eq('is_canceled', false);

      if (error) throw error;

      // Filtrar apenas clientes pré-pagos
      const prepaidClients = clients?.filter(client => {
        const rawAccounts = client.facebook_ad_accounts as unknown;
        const accounts = Array.isArray(rawAccounts) ? rawAccounts as Array<{ balance: number; is_prepaid: boolean; recharge_day: number }> : null;
        const hasPrepaidAccount = accounts?.some(acc => acc.is_prepaid);
        return client.meta_payment_type === 'prepaid' || hasPrepaidAccount;
      }) || [];

      // Para cada cliente, buscar o gasto das campanhas ativas nos últimos 30 dias
      const clientesComDados: ClientePrepago[] = await Promise.all(
        prepaidClients.map(async (client) => {
          const rawAccounts = client.facebook_ad_accounts as unknown;
          const accounts = Array.isArray(rawAccounts) ? rawAccounts as Array<{ balance: number; is_prepaid: boolean; recharge_day: number }> : null;
          
          // Somar saldo de todas as contas do cliente
          const totalBalance = accounts?.reduce(
            (sum, acc) => sum + (acc.balance || 0), 0
          ) || 0;

          // Pegar dia de recarga (prioridade: conta > cliente)
          const rechargeDay = accounts?.[0]?.recharge_day || 
                              client.meta_recharge_day || 
                              null;

          // Buscar gasto dos últimos 30 dias
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const { data: campaigns } = await supabase
            .from('campaigns')
            .select('spend')
            .eq('client_id', client.id)
            .eq('is_active', true);

          const totalSpend = campaigns?.reduce((sum, c) => sum + (c.spend || 0), 0) || 0;
          const dailySpend = totalSpend / 30;

          // Calcular dias restantes
          const daysRemaining = dailySpend > 0 ? Math.floor(totalBalance / dailySpend) : 999;

          // Calcular próxima data de recarga
          let nextRechargeDate: Date | null = null;
          let daysUntilRecharge = 999;
          
          if (rechargeDay) {
            const today = new Date();
            nextRechargeDate = new Date(today.getFullYear(), today.getMonth(), rechargeDay);
            
            // Se a data já passou neste mês, usar o próximo mês
            if (nextRechargeDate < today) {
              nextRechargeDate.setMonth(nextRechargeDate.getMonth() + 1);
            }
            
            daysUntilRecharge = Math.ceil(
              (nextRechargeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
          }

          // Determinar status
          let status: 'suficiente' | 'apertado' | 'insuficiente' = 'suficiente';
          if (daysRemaining < daysUntilRecharge) {
            status = 'insuficiente';
          } else if (daysRemaining < daysUntilRecharge + 3) {
            status = 'apertado';
          }

          return {
            id: client.id,
            name: client.name,
            company: client.company,
            balance: totalBalance,
            rechargeDay,
            dailySpend,
            daysRemaining,
            nextRechargeDate,
            daysUntilRecharge,
            status,
          };
        })
      );

      return clientesComDados;
    },
    enabled: !!activeCompany?.company_id,
  });

  // Estatísticas de resumo
  const stats = useMemo(() => {
    if (!clientesPrePagos) return { total: 0, saldoTotal: 0, criticos: 0, ok: 0 };

    return {
      total: clientesPrePagos.length,
      saldoTotal: clientesPrePagos.reduce((sum, c) => sum + c.balance, 0),
      criticos: clientesPrePagos.filter(c => c.status === 'insuficiente').length,
      ok: clientesPrePagos.filter(c => c.status === 'suficiente').length,
    };
  }, [clientesPrePagos]);

  // Filtrar e ordenar
  const clientesFiltrados = useMemo(() => {
    if (!clientesPrePagos) return [];

    let filtered = clientesPrePagos.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'daysRemaining':
          return a.daysRemaining - b.daysRemaining;
        case 'balance':
          return b.balance - a.balance;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [clientesPrePagos, searchTerm, statusFilter, sortBy]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'suficiente':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Suficiente</Badge>;
      case 'apertado':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Apertado</Badge>;
      case 'insuficiente':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Insuficiente</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/marketing/relatorios')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Saldo de Clientes Pré-Pagos</h1>
            <p className="text-muted-foreground">
              Acompanhe o saldo e previsão de duração para clientes com contas pré-pagas
            </p>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Clientes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Wallet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.saldoTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo Crítico</p>
                  <p className="text-2xl font-bold text-red-600">{stats.criticos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo OK</p>
                  <p className="text-2xl font-bold text-green-600">{stats.ok}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="suficiente">Suficiente</SelectItem>
                  <SelectItem value="apertado">Apertado</SelectItem>
                  <SelectItem value="insuficiente">Insuficiente</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daysRemaining">Dias Restantes</SelectItem>
                  <SelectItem value="balance">Saldo</SelectItem>
                  <SelectItem value="name">Nome</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Lista de Clientes Pré-Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Nenhum cliente encontrado com os filtros aplicados'
                  : 'Nenhum cliente pré-pago encontrado'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Saldo Atual</TableHead>
                    <TableHead className="text-right">Gasto/Dia</TableHead>
                    <TableHead className="text-center">Dia Recarga</TableHead>
                    <TableHead className="text-right">Duração Prevista</TableHead>
                    <TableHead className="text-center">Próxima Recarga</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.map((cliente) => (
                    <TableRow 
                      key={cliente.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/clientes/${cliente.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{cliente.name}</p>
                          <p className="text-sm text-muted-foreground">{cliente.company}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(cliente.balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(cliente.dailySpend)}
                      </TableCell>
                      <TableCell className="text-center">
                        {cliente.rechargeDay ? (
                          <span className="flex items-center justify-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Dia {cliente.rechargeDay}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cliente.daysRemaining < 7 ? 'text-red-600 font-medium' : ''}>
                          {cliente.daysRemaining === 999 ? '∞' : `${cliente.daysRemaining} dias`}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {formatDate(cliente.nextRechargeDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(cliente.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default RelatorioSaldoPrePagos;
