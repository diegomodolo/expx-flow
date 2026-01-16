import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LeadIntelligenceLayout } from "@/components/leads/LeadIntelligenceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Building2, Phone, Mail, MapPin, Calendar, Smartphone, Filter, Send } from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CnaeLeadFiltersDialog, CnaeLeadFilters } from "@/components/leads/CnaeLeadFiltersDialog";
import { SendToSegmentModal } from "@/components/leads/SendToSegmentModal";
import { useLeadScoring } from "@/hooks/useLeadScoring";
import { toast } from "sonner";

const PAGE_SIZE = 50;

interface CnaeLead {
  id: string;
  company_id: string;
  cnpj: string;
  cnae_code: string;
  cnae_description: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  email: string | null;
  ddd: string | null;
  phone: string | null;
  phone_2: string | null;
  phone_3: string | null;
  municipio: string | null;
  uf: string | null;
  capital_social: number | null;
  created_at: string;
  situacao_cadastral: string | null;
  porte: string | null;
  simples_option: string | null;
  mei_option: string | null;
  data_abertura: string | null;
}

interface CnaeCatalogItem {
  cnae_description: string | null;
}

// Helper to generate hash
async function generateHash(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function CnaeLeadsView() {
  const { cnaeCode } = useParams<{ cnaeCode: string }>();
  const decodedCnaeCode = decodeURIComponent(cnaeCode || '');
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const queryClient = useQueryClient();
  const { scoreAllCompanyLeads } = useLeadScoring();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [filters, setFilters] = useState<CnaeLeadFilters>({});

  // Count active filters
  const activeFiltersCount = Object.entries(filters).filter(([_, v]) => {
    if (v === undefined || v === false || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }).length;

  // Build filter query helper
  const buildFilteredQuery = () => {
    let query = supabase
      .from('cnae_lead_pool' as any)
      .select('*')
      .eq('company_id', companyId)
      .eq('cnae_code', decodedCnaeCode);

    if (searchTerm) {
      query = query.or(`razao_social.ilike.%${searchTerm}%,cnpj.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }
    if (filters.ufs && filters.ufs.length > 0) {
      query = query.in('uf', filters.ufs);
    }
    if (filters.municipios && filters.municipios.length > 0) {
      query = query.in('municipio', filters.municipios);
    }
    if (filters.situacaoCadastral) {
      query = query.eq('situacao_cadastral', filters.situacaoCadastral);
    }
    if (filters.porte) {
      query = query.eq('porte', filters.porte);
    }
    if (filters.simplesOption) {
      query = query.eq('simples_option', filters.simplesOption);
    }
    if (filters.meiOption) {
      query = query.eq('mei_option', filters.meiOption);
    }
    if (filters.capitalSocialMin) {
      query = query.gte('capital_social', filters.capitalSocialMin);
    }
    if (filters.capitalSocialMax) {
      query = query.lte('capital_social', filters.capitalSocialMax);
    }
    if (filters.dataAberturaFrom) {
      query = query.gte('data_abertura', filters.dataAberturaFrom);
    }
    if (filters.dataAberturaTo) {
      query = query.lte('data_abertura', filters.dataAberturaTo);
    }
    if (filters.hasEmail) {
      query = query.not('email', 'is', null);
    }
    if (filters.hasPhone) {
      query = query.not('phone', 'is', null);
    }

    return query;
  };

  // Fetch CNAE info
  const { data: cnaeInfo } = useQuery({
    queryKey: ['cnae-info', companyId, decodedCnaeCode],
    queryFn: async () => {
      if (!companyId || !decodedCnaeCode) return null;
      const { data, error } = await supabase
        .from('cnae_lead_pool' as any)
        .select('cnae_description')
        .eq('company_id', companyId)
        .eq('cnae_code', decodedCnaeCode)
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as CnaeCatalogItem | null;
    },
    enabled: !!companyId && !!decodedCnaeCode
  });

  // Fetch leads for this CNAE with pagination and filters
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['cnae-leads', companyId, decodedCnaeCode, currentPage, searchTerm, filters],
    queryFn: async () => {
      if (!companyId || !decodedCnaeCode) return { leads: [], count: 0 };
      
      let query = supabase
        .from('cnae_lead_pool' as any)
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .eq('cnae_code', decodedCnaeCode);

      if (searchTerm) {
        query = query.or(`razao_social.ilike.%${searchTerm}%,cnpj.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      if (filters.ufs && filters.ufs.length > 0) {
        query = query.in('uf', filters.ufs);
      }
      if (filters.municipios && filters.municipios.length > 0) {
        query = query.in('municipio', filters.municipios);
      }
      if (filters.situacaoCadastral) {
        query = query.eq('situacao_cadastral', filters.situacaoCadastral);
      }
      if (filters.porte) {
        query = query.eq('porte', filters.porte);
      }
      if (filters.simplesOption) {
        query = query.eq('simples_option', filters.simplesOption);
      }
      if (filters.meiOption) {
        query = query.eq('mei_option', filters.meiOption);
      }
      if (filters.capitalSocialMin) {
        query = query.gte('capital_social', filters.capitalSocialMin);
      }
      if (filters.capitalSocialMax) {
        query = query.lte('capital_social', filters.capitalSocialMax);
      }
      if (filters.dataAberturaFrom) {
        query = query.gte('data_abertura', filters.dataAberturaFrom);
      }
      if (filters.dataAberturaTo) {
        query = query.lte('data_abertura', filters.dataAberturaTo);
      }
      if (filters.hasEmail) {
        query = query.not('email', 'is', null);
      }
      if (filters.hasPhone) {
        query = query.not('phone', 'is', null);
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

  // Handle filter application
  const handleApplyFilters = (newFilters: CnaeLeadFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Handle send to segment
  const handleSendToSegment = async (segmentId: string, segmentName: string, isNew: boolean) => {
    if (!companyId) return;

    const toastId = toast.loading(`Enviando leads para "${segmentName}"...`);

    try {
      // Fetch all filtered leads (without pagination)
      const allLeadsQuery = buildFilteredQuery();
      const { data: allLeads, error: fetchError } = await allLeadsQuery;

      if (fetchError) throw fetchError;
      if (!allLeads || allLeads.length === 0) {
        toast.error("Nenhum lead para enviar", { id: toastId });
        return;
      }

      const cnaeLeads = allLeads as unknown as CnaeLead[];
      let imported = 0;
      let duplicates = 0;

      // Process leads in batches
      const batchSize = 100;
      const insertedLeadIds: string[] = [];

      for (let i = 0; i < cnaeLeads.length; i += batchSize) {
        const batch = cnaeLeads.slice(i, i + batchSize);
        
        // Transform CNAE leads to lead_master_pool format
        const leadsToInsert = await Promise.all(batch.map(async (lead) => {
          const emailHash = lead.email ? await generateHash(lead.email) : null;
          const phoneHash = lead.phone ? await generateHash(lead.phone) : null;

          return {
            company_id: companyId,
            email: lead.email,
            email_hash: emailHash,
            phone: lead.phone,
            phone_hash: phoneHash,
            full_name: lead.razao_social,
            company_name: lead.razao_social,
            company_trade_name: lead.nome_fantasia,
            cnpj: lead.cnpj,
            city: lead.municipio,
            state: lead.uf,
            cnae: lead.cnae_code,
            original_source: `CNAE ${lead.cnae_code}`,
            global_score: 0,
            total_conversions: 0,
            total_value: 0,
            first_captured_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          };
        }));

        // Check for existing leads by email_hash or phone_hash
        const emailHashes = leadsToInsert.map(l => l.email_hash).filter(Boolean) as string[];
        const phoneHashes = leadsToInsert.map(l => l.phone_hash).filter(Boolean) as string[];

        const existingHashes = new Set<string>();

        if (emailHashes.length > 0) {
          const { data: existingEmails } = await supabase
            .from('lead_master_pool')
            .select('email_hash')
            .eq('company_id', companyId)
            .in('email_hash', emailHashes);
          existingEmails?.forEach(e => e.email_hash && existingHashes.add(e.email_hash));
        }

        if (phoneHashes.length > 0) {
          const { data: existingPhones } = await supabase
            .from('lead_master_pool')
            .select('phone_hash')
            .eq('company_id', companyId)
            .in('phone_hash', phoneHashes);
          existingPhones?.forEach(p => p.phone_hash && existingHashes.add(p.phone_hash));
        }

        // Filter out duplicates
        const newLeads = leadsToInsert.filter(lead => {
          const isDuplicate = 
            (lead.email_hash && existingHashes.has(lead.email_hash)) ||
            (lead.phone_hash && existingHashes.has(lead.phone_hash));
          if (isDuplicate) {
            duplicates++;
            return false;
          }
          return true;
        });

        // Insert new leads
        if (newLeads.length > 0) {
          const { data: insertedBatch, error: insertError } = await supabase
            .from('lead_master_pool')
            .insert(newLeads)
            .select('id');

          if (insertError) {
            console.error("Batch insert error:", insertError);
          } else if (insertedBatch) {
            insertedBatch.forEach(l => insertedLeadIds.push(l.id));
            imported += insertedBatch.length;
          }
        }
      }

      // Assign leads to segment
      if (insertedLeadIds.length > 0) {
        const segmentAssignments = insertedLeadIds.map(leadId => ({
          lead_id: leadId,
          segment_id: segmentId
        }));

        for (let i = 0; i < segmentAssignments.length; i += batchSize) {
          const batch = segmentAssignments.slice(i, i + batchSize);
          await supabase.from('lead_segment_assignments').insert(batch);
        }

        // Update segment lead count
        await supabase
          .from('lead_segments')
          .update({ 
            lead_count: insertedLeadIds.length,
            last_calculated_at: new Date().toISOString()
          })
          .eq('id', segmentId);
      }

      // Show result
      if (imported > 0) {
        toast.success(
          `${imported} leads enviados para "${segmentName}"${duplicates > 0 ? ` (${duplicates} duplicados ignorados)` : ''}`,
          { id: toastId }
        );

        // Recalculate scores in background
        toast.info("Recalculando scores em segundo plano...");
        scoreAllCompanyLeads()
          .then((scoredCount) => {
            queryClient.invalidateQueries({ queryKey: ['lead-pool'] });
            queryClient.invalidateQueries({ queryKey: ['lead-segments'] });
            queryClient.invalidateQueries({ queryKey: ['lead-segments-dashboard'] });
            toast.success(`${scoredCount} leads recalculados!`);
          })
          .catch((err) => {
            console.error("Error recalculating scores:", err);
          });
      } else {
        toast.warning(`Todos os ${duplicates} leads já existem no sistema`, { id: toastId });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['lead-segments'] });
      queryClient.invalidateQueries({ queryKey: ['lead-segments-for-send'] });

    } catch (error) {
      console.error("Error sending to segment:", error);
      toast.error("Erro ao enviar leads para o segmento", { id: toastId });
    }
  };

  // Render phone numbers
  const renderPhones = (lead: CnaeLead) => {
    const phones = [
      { value: lead.phone, label: 'Tel 1', icon: Phone },
      { value: lead.phone_2, label: 'Tel 2', icon: Phone },
      { value: lead.phone_3, label: 'Cel', icon: Smartphone },
    ].filter(p => p.value);

    if (phones.length === 0) return <span className="text-muted-foreground">-</span>;

    return (
      <TooltipProvider>
        <div className="space-y-1">
          {phones.slice(0, 2).map((p, i) => (
            <div key={i} className="flex items-center gap-1 text-xs">
              <p.icon className="h-3 w-3 text-muted-foreground" />
              <span>{p.value}</span>
            </div>
          ))}
          {phones.length > 2 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs cursor-pointer">
                  +{phones.length - 2} tel
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {phones.slice(2).map((p, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <p.icon className="h-3 w-3" />
                    <span>{p.label}: {p.value}</span>
                  </div>
                ))}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
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
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {leadsData?.count?.toLocaleString('pt-BR') || 0} leads
                </Badge>
                {(leadsData?.count || 0) > 0 && (
                  <Button
                    onClick={() => setIsSendModalOpen(true)}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Enviar para Segmento
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Search and Table */}
          <Card>
            <CardHeader>
              <CardTitle>Leads do CNAE</CardTitle>
              <CardDescription>
                Lista de empresas com este código de atividade
              </CardDescription>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <div className="relative flex-1">
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
                <Button
                  variant="outline"
                  onClick={() => setIsFiltersOpen(true)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
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
                    {searchTerm || activeFiltersCount > 0
                      ? "Tente ajustar seus filtros ou buscar por outro termo" 
                      : "Não há leads cadastrados para este CNAE"
                    }
                  </p>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setFilters({})}
                      className="mt-4"
                    >
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empresa</TableHead>
                          <TableHead>CNPJ</TableHead>
                          <TableHead>Telefones</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Localização</TableHead>
                          <TableHead>Capital Social</TableHead>
                          <TableHead>Cadastrado em</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leadsData?.leads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>
                              <div className="font-medium">{lead.razao_social || '-'}</div>
                              {lead.nome_fantasia && (
                                <div className="text-xs text-muted-foreground">{lead.nome_fantasia}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {lead.cnpj || '-'}
                              </code>
                            </TableCell>
                            <TableCell>
                              {renderPhones(lead)}
                            </TableCell>
                            <TableCell>
                              {lead.email ? (
                                <div className="flex items-center gap-1 text-xs">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate max-w-32">{lead.email}</span>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {lead.municipio || lead.uf ? (
                                <div className="flex items-center gap-1 text-xs">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span>
                                    {[lead.municipio, lead.uf].filter(Boolean).join(' - ')}
                                  </span>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {lead.capital_social 
                                ? `R$ ${Number(lead.capital_social).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
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

        {/* Filters Dialog */}
        <CnaeLeadFiltersDialog
          open={isFiltersOpen}
          onOpenChange={setIsFiltersOpen}
          filters={filters}
          onApplyFilters={handleApplyFilters}
          companyId={companyId}
          cnaeCode={decodedCnaeCode}
        />

        {/* Send to Segment Modal */}
        {companyId && (
          <SendToSegmentModal
            open={isSendModalOpen}
            onOpenChange={setIsSendModalOpen}
            companyId={companyId}
            leadsCount={leadsData?.count || 0}
            onConfirm={handleSendToSegment}
          />
        )}
      </LeadIntelligenceLayout>
    </DashboardLayout>
  );
}
