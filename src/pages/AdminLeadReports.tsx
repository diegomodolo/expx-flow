import React, { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CalendarIcon,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Search,
  AlertCircle,
  Eye
} from "lucide-react";
import { useLeadDisqualificationReports } from "@/hooks/useLeadDisqualificationReports";
import { useClients } from "@/hooks/useClients";
import { useLeadDisqualificationNotifications } from "@/hooks/useLeadDisqualificationNotifications";
import { EvidenceViewerModal } from "@/components/ui/EvidenceViewerModal";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function AdminLeadReports() {
  const [filters, setFilters] = useState({
    clientId: "all",
    reason: "all",
    startDate: "",
    endDate: "",
    search: "",
    viewedStatus: "all"
  });
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [evidenceModalUrl, setEvidenceModalUrl] = useState<string | null>(null);

  const { reports, loading, getReasonLabel, exportReports } = useLeadDisqualificationReports(filters);
  const { clients } = useClients();
  const { markAllAsViewed } = useLeadDisqualificationNotifications();
  const { activeCompany } = useCompany();
  const { user } = useAuth();

  // Função local para marcar como visualizado
  const markAsViewedLocal = async () => {
    if (!activeCompany?.company_id || !user?.id) {
      console.log('markAsViewedLocal: Dados insuficientes', {
        companyId: activeCompany?.company_id,
        userId: user?.id
      });
      return false;
    }

    try {
      console.log('markAsViewedLocal: Executando para company:', activeCompany.company_id);
      
      // Primeiro vamos ver o que existe na tabela
      const { data: allReports, error: fetchError } = await supabase
        .from('lead_disqualification_reports')
        .select('id, reporter_name, created_at, viewed_at, viewed_by')
        .eq('company_id', activeCompany.company_id)
        .order('created_at', { ascending: false });

      console.log('markAsViewedLocal: Todos os reports da company:', allReports);

      // Agora vamos ver especificamente os não visualizados
      const { data: unviewedReports, error: unviewedError } = await supabase
        .from('lead_disqualification_reports')
        .select('id, reporter_name, created_at, viewed_at')
        .eq('company_id', activeCompany.company_id)
        .is('viewed_at', null);

      console.log('markAsViewedLocal: Reports não visualizados:', unviewedReports);

      if (fetchError || unviewedError) {
        console.error('markAsViewedLocal: Erro ao buscar dados:', fetchError || unviewedError);
        return false;
      }

      if (!unviewedReports || unviewedReports.length === 0) {
        console.log('markAsViewedLocal: Nenhum report não visualizado encontrado');
        return true; // Não há nada para marcar
      }

      // Agora executar o update
      const { data: updateResult, error } = await supabase
        .from('lead_disqualification_reports')
        .update({
          viewed_at: new Date().toISOString(),
          viewed_by: user.id
        })
        .eq('company_id', activeCompany.company_id)
        .is('viewed_at', null)
        .select('id');

      if (error) {
        console.error('markAsViewedLocal: Erro ao atualizar:', error);
        return false;
      }

      console.log('markAsViewedLocal: Sucesso!', updateResult?.length || 0, 'reports marcados');
      return true;
    } catch (err) {
      console.error('markAsViewedLocal: Erro:', err);
      return false;
    }
  };

  // Auto-mark as viewed when component mounts
  React.useEffect(() => {
    const markAsViewed = async () => {
      console.log('AdminLeadReports: activeCompany disponível?', activeCompany?.company_id);
      
      if (activeCompany?.company_id && user?.id) {
        console.log('Página AdminLeadReports carregada, tentando marcar como visualizados');
        
        // Tentar primeiro a função local
        const localSuccess = await markAsViewedLocal();
        
        if (!localSuccess && markAllAsViewed) {
          console.log('Tentativa local falhou, usando markAllAsViewed');
          await markAllAsViewed();
        }
        
        // Forçar update do contador no header
        setTimeout(() => {
          console.log('Forçando refresh do contador após 2 segundos');
          window.dispatchEvent(new CustomEvent('refreshNotificationCount'));
        }, 2000);
      } else {
        console.log('AdminLeadReports: Aguardando dados...', {
          companyId: activeCompany?.company_id,
          userId: user?.id
        });
      }
    };
    
    // Delay para garantir que a página carregou completamente
    const timer = setTimeout(markAsViewed, 1500);
    return () => clearTimeout(timer);
  }, [activeCompany?.company_id, user?.id]);

  const reasonOptions = [
    { value: "all", label: "Todos os motivos" },
    { value: "fora_perfil", label: "Fora do perfil" },
    { value: "informacoes_incorretas", label: "Informações incorretas" },
    { value: "contato_errado", label: "Contato errado" },
    { value: "ligacao_sem_resposta", label: "Ligação sem resposta" },
    { value: "outro", label: "Outro" }
  ];

  const viewedStatusOptions = [
    { value: "all", label: "Todos os status" },
    { value: "viewed", label: "Visualizados" },
    { value: "unviewed", label: "Não visualizados" }
  ];

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (type === 'start') {
      setStartDate(date);
      setFilters(prev => ({ ...prev, startDate: date ? format(date, 'yyyy-MM-dd') : "" }));
    } else {
      setEndDate(date);
      setFilters(prev => ({ ...prev, endDate: date ? format(date, 'yyyy-MM-dd') : "" }));
    }
  };

  const clearFilters = () => {
    setFilters({ clientId: "all", reason: "all", startDate: "", endDate: "", search: "", viewedStatus: "all" });
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const getReasonBadgeColor = (reason: string) => {
    const colors: Record<string, string> = {
      'fora_perfil': 'bg-red-100 text-red-800',
      'informacoes_incorretas': 'bg-yellow-100 text-yellow-800',
      'contato_errado': 'bg-blue-100 text-blue-800',
      'ligacao_sem_resposta': 'bg-gray-100 text-gray-800',
      'outro': 'bg-purple-100 text-purple-800'
    };
    return colors[reason] || 'bg-gray-100 text-gray-800';
  };

  const filteredReports = reports.filter(report => {
    // Filter by search text
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = (
        report.reporter_name.toLowerCase().includes(searchLower) ||
        getReasonLabel(report.disqualification_reason).toLowerCase().includes(searchLower) ||
        (report.additional_notes && report.additional_notes.toLowerCase().includes(searchLower))
      );
      if (!matchesSearch) return false;
    }

    // Filter by viewed status
    if (filters.viewedStatus && filters.viewedStatus !== 'all') {
      if (filters.viewedStatus === 'viewed' && !report.viewed_at) return false;
      if (filters.viewedStatus === 'unviewed' && report.viewed_at) return false;
    }

    return true;
  });

  const handleViewEvidence = (evidenceUrl: string) => {
    setEvidenceModalUrl(evidenceUrl);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Administração de Reports</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie todos os reports de leads desqualificados
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => exportReports('csv')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => exportReports('pdf')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Busca */}
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Nome, motivo, observações..."
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Cliente */}
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  value={filters.clientId}
                  onValueChange={(value) => handleFilterChange('clientId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Motivo */}
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select
                  value={filters.reason}
                  onValueChange={(value) => handleFilterChange('reason', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os motivos" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data inicial */}
              <div className="space-y-2">
                <Label>Data inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP", { locale: ptBR }) : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => handleDateChange('start', date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Status de visualização */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.viewedStatus}
                  onValueChange={(value) => handleFilterChange('viewedStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    {viewedStatusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Reports</p>
                  <p className="text-2xl font-bold">{filteredReports.length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fora do Perfil</p>
                  <p className="text-2xl font-bold">
                    {filteredReports.filter(r => r.disqualification_reason === 'fora_perfil').length}
                  </p>
                </div>
                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Info Incorretas</p>
                  <p className="text-2xl font-bold">
                    {filteredReports.filter(r => r.disqualification_reason === 'informacoes_incorretas').length}
                  </p>
                </div>
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sem Resposta</p>
                  <p className="text-2xl font-bold">
                    {filteredReports.filter(r => r.disqualification_reason === 'ligacao_sem_resposta').length}
                  </p>
                </div>
                <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Reports Recebidos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando reports...</span>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum report encontrado</p>
                <p className="text-sm">Tente ajustar os filtros ou aguarde novos reports</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Reportado por</TableHead>
                      <TableHead>Data do Lead</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => {
                      const client = clients.find(c => c.id === report.client_id);
                      return (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">
                            {format(new Date(report.created_at), "PPP 'às' HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{client?.name || 'Cliente não encontrado'}</p>
                              <p className="text-xs text-muted-foreground">{client?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{report.reporter_name}</TableCell>
                          <TableCell>
                            {format(new Date(report.lead_received_date), "PPP", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge className={getReasonBadgeColor(report.disqualification_reason)}>
                              {getReasonLabel(report.disqualification_reason)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              {report.additional_notes ? (
                                <p className="text-sm truncate" title={report.additional_notes}>
                                  {report.additional_notes}
                                </p>
                              ) : (
                                <span className="text-muted-foreground text-sm">Sem observações</span>
                              )}
                            </div>
                          </TableCell>
                           <TableCell className="text-center">
                             <div className="flex items-center justify-center gap-1">
                               {!report.viewed_at && (
                                 <Badge variant="destructive" className="text-xs">
                                   Novo
                                 </Badge>
                               )}
                               {report.evidence_file_url && (
                                 <Button 
                                   variant="ghost" 
                                   size="sm" 
                                   className="h-8 w-8 p-0"
                                   onClick={() => handleViewEvidence(report.evidence_file_url!)}
                                   title="Ver evidência"
                                 >
                                   <Eye className="h-4 w-4" />
                                 </Button>
                               )}
                               {report.conversation_link && (
                                 <Button 
                                   variant="ghost" 
                                   size="sm" 
                                   className="h-8 w-8 p-0"
                                   onClick={() => window.open(report.conversation_link, '_blank')}
                                   title="Ver conversa"
                                 >
                                   <Download className="h-4 w-4" />
                                 </Button>
                               )}
                             </div>
                           </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evidence Modal */}
      {evidenceModalUrl && (
        <EvidenceViewerModal
          isOpen={!!evidenceModalUrl}
          onClose={() => setEvidenceModalUrl(null)}
          imageUrl={evidenceModalUrl}
          fileName="evidencia.jpg"
        />
      )}
    </DashboardLayout>
  );
}