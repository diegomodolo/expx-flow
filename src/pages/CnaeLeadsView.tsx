import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LeadIntelligenceLayout } from "@/components/leads/LeadIntelligenceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Building2, Phone, Mail, MapPin, Calendar } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Link, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 50;

interface CnaeLead {
  id: string;
  company_id: string;
  cnpj: string;
  cnae_code: string;
  cnae_description: string | null;
  company_name: string | null;
  trade_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  share_capital: number | null;
  created_at: string;
}

interface CnaeCatalogItem {
  cnae_description: string | null;
}

export default function CnaeLeadsView() {
  const { cnaeCode } = useParams<{ cnaeCode: string }>();
  const decodedCnaeCode = decodeURIComponent(cnaeCode || '');
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch CNAE info
  const { data: cnaeInfo } = useQuery({
    queryKey: ['cnae-info', companyId, decodedCnaeCode],
    queryFn: async () => {
      if (!companyId || !decodedCnaeCode) return null;
      const { data, error } = await supabase
        .from('cnae_catalog' as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('cnae_code', decodedCnaeCode)
        .single();
      
      if (error) throw error;
      return data as unknown as CnaeCatalogItem | null;
    },
    enabled: !!companyId && !!decodedCnaeCode
  });

  // Fetch leads for this CNAE with pagination
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['cnae-leads', companyId, decodedCnaeCode, currentPage, searchTerm],
    queryFn: async () => {
      if (!companyId || !decodedCnaeCode) return { leads: [], count: 0 };
      
      let query = supabase
        .from('cnae_lead_pool' as any)
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .eq('cnae_code', decodedCnaeCode);

      if (searchTerm) {
        query = query.or(`company_name.ilike.%${searchTerm}%,cnpj.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);
      
      if (error) throw error;
      return { leads: (data || []) as unknown as CnaeLead[], count: count || 0 };
    },
    enabled: !!companyId && !!decodedCnaeCode
  });

  const totalPages = Math.ceil((leadsData?.count || 0) / PAGE_SIZE);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  return (
    <DashboardLayout>
      <LeadIntelligenceLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <Link to="/lead-intelligence/cnae-base">
              <Button variant="ghost" size="sm" className="gap-2 mb-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar para Base de CNAEs
              </Button>
            </Link>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  CNAE {decodedCnaeCode}
                </h1>
                <p className="text-muted-foreground">
                  {cnaeInfo?.cnae_description || 'Leads desta atividade econômica'}
                </p>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {leadsData?.count?.toLocaleString('pt-BR') || 0} leads
              </Badge>
            </div>
          </div>

          {/* Search and Table */}
          <Card>
            <CardHeader>
              <CardTitle>Leads do CNAE</CardTitle>
              <CardDescription>
                Lista de empresas com este código de atividade
              </CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CNPJ ou email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : leadsData?.leads.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum lead encontrado</h3>
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? "Tente buscar por outro termo" 
                      : "Não há leads cadastrados para este CNAE"
                    }
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empresa</TableHead>
                          <TableHead>CNPJ</TableHead>
                          <TableHead>Contato</TableHead>
                          <TableHead>Localização</TableHead>
                          <TableHead>Capital Social</TableHead>
                          <TableHead>Cadastrado em</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leadsData?.leads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>
                              <div className="font-medium">{lead.company_name || '-'}</div>
                              {lead.trade_name && (
                                <div className="text-xs text-muted-foreground">{lead.trade_name}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {lead.cnpj || '-'}
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {lead.email && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                    <span className="truncate max-w-32">{lead.email}</span>
                                  </div>
                                )}
                                {lead.phone && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                    <span>{lead.phone}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {lead.city || lead.state ? (
                                <div className="flex items-center gap-1 text-xs">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span>
                                    {[lead.city, lead.state].filter(Boolean).join(' - ')}
                                  </span>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {lead.share_capital 
                                ? `R$ ${Number(lead.share_capital).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(lead.created_at)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(pageNum)}
                                  isActive={currentPage === pageNum}
                                  className="cursor-pointer"
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </LeadIntelligenceLayout>
    </DashboardLayout>
  );
}
