import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LeadIntelligenceLayout } from "@/components/leads/LeadIntelligenceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Database, Upload, Search, Building2, Users, TrendingUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { CnaeImportModal } from "@/components/leads/CnaeImportModal";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CnaeCatalogItem {
  id: string;
  company_id: string;
  cnae_code: string;
  cnae_description: string | null;
  lead_count: number;
  created_at: string;
  updated_at: string;
}

export default function CnaeBaseDashboard() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch CNAE catalog
  const { data: cnaeCatalog, isLoading } = useQuery({
    queryKey: ['cnae-catalog', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('cnae_catalog' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('lead_count', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as CnaeCatalogItem[];
    },
    enabled: !!companyId
  });

  // Fetch total leads count
  const { data: totalLeads } = useQuery({
    queryKey: ['cnae-leads-count', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count, error } = await supabase
        .from('cnae_lead_pool' as any)
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!companyId
  });

  const filteredCatalog = cnaeCatalog?.filter(cnae => 
    cnae.cnae_code.includes(searchTerm) || 
    cnae.cnae_description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalCnaes = cnaeCatalog?.length || 0;

  return (
    <DashboardLayout>
      <LeadIntelligenceLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Database className="h-6 w-6 text-primary" />
                Base de CNAEs
              </h1>
              <p className="text-muted-foreground">
                Gerencie sua base de leads por código CNAE
              </p>
            </div>
            <Button onClick={() => setIsImportModalOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Importar Planilha
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLeads?.toLocaleString('pt-BR') || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Na base de CNAEs
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CNAEs Cadastrados</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCnaes}</div>
                <p className="text-xs text-muted-foreground">
                  Códigos de atividade
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Média por CNAE</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalCnaes > 0 ? Math.round((totalLeads || 0) / totalCnaes).toLocaleString('pt-BR') : 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Leads por código
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Table */}
          <Card>
            <CardHeader>
              <CardTitle>CNAEs na Base</CardTitle>
              <CardDescription>
                Clique em um CNAE para ver os leads associados
              </CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum CNAE encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? "Tente buscar por outro termo" 
                      : "Importe uma planilha para começar a popular sua base de CNAEs"
                    }
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsImportModalOpen(true)} variant="outline" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Importar Planilha
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código CNAE</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCatalog.map((cnae) => (
                      <TableRow key={cnae.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {cnae.cnae_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {cnae.cnae_description || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {cnae.lead_count?.toLocaleString('pt-BR') || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link to={`/lead-intelligence/cnae-base/${encodeURIComponent(cnae.cnae_code)}`}>
                            <Button variant="ghost" size="sm" className="gap-1">
                              Ver leads
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <CnaeImportModal 
          open={isImportModalOpen} 
          onOpenChange={setIsImportModalOpen}
        />
      </LeadIntelligenceLayout>
    </DashboardLayout>
  );
}
