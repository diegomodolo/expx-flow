import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { History, Upload, Globe, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const LeadHistoryTab = () => {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  // Fetch import history
  const { data: imports, isLoading: loadingImports } = useQuery({
    queryKey: ['lead-import-history', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('lead_import_history')
        .select('*, segment:lead_segments(name, color)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  // Fetch API request history
  const { data: apiRequests, isLoading: loadingApi } = useQuery({
    queryKey: ['lead-api-request-history', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('lead_api_request_log')
        .select('*, api_key:company_api_keys(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Sucesso</Badge>;
      case 'error':
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      case 'partial':
      case 'processing':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><AlertCircle className="h-3 w-3 mr-1" />Parcial</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case 'capture':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Captura</Badge>;
      case 'conversion':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Conversão</Badge>;
      case 'update':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">Atualização</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Últimas Importações
          </CardTitle>
          <CardDescription>
            Histórico das últimas 10 importações de arquivos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingImports ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : imports && imports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Importados</TableHead>
                  <TableHead className="text-center">Duplicados</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp: any) => (
                  <TableRow key={imp.id}>
                    <TableCell className="text-sm">
                      {format(new Date(imp.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{imp.file_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {imp.segment ? (
                        <Badge variant="outline" style={{ borderColor: imp.segment.color, color: imp.segment.color }}>
                          {imp.segment.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">{imp.total_rows}</TableCell>
                    <TableCell className="text-center text-green-600">{imp.leads_imported}</TableCell>
                    <TableCell className="text-center text-yellow-600">{imp.leads_duplicated}</TableCell>
                    <TableCell>{getStatusBadge(imp.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma importação encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Request History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Últimas Requisições API
          </CardTitle>
          <CardDescription>
            Histórico das últimas 10 requisições via API pública
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingApi ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : apiRequests && apiRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-center">Leads</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiRequests.map((req: any) => (
                  <TableRow key={req.id}>
                    <TableCell className="text-sm">
                      {format(new Date(req.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getRequestTypeBadge(req.request_type)}</TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">{req.api_key?.name || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      {req.source_info ? (
                        <span className="truncate max-w-[150px] text-sm">{req.source_info}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">{req.leads_processed}</TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma requisição API encontrada</p>
              <p className="text-sm mt-1">Requisições via API pública aparecerão aqui</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
