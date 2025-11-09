import { CRMLead, CRMStage } from "@/hooks/useCRMLeads";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Phone, Mail, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CRMLeadsTableProps {
  leads: CRMLead[];
  stages: CRMStage[];
  onLeadClick: (lead: CRMLead) => void;
  searchTerm?: string;
}

export function CRMLeadsTable({ leads, stages, onLeadClick, searchTerm }: CRMLeadsTableProps) {
  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lead.full_name.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search) ||
      lead.phone?.toLowerCase().includes(search) ||
      lead.company_name?.toLowerCase().includes(search)
    );
  });

  const getStageName = (stageId: string) => {
    return stages.find(s => s.id === stageId)?.name || "—";
  };

  const getStageColor = (stageId: string) => {
    return stages.find(s => s.id === stageId)?.color || "#6366f1";
  };

  const getStatusBadge = (status: CRMLead['status']) => {
    const statusConfig = {
      'open': { label: 'Aberto', variant: 'default' },
      'qualified': { label: 'Qualificado', variant: 'default' },
      'unqualified': { label: 'Desqualificado', variant: 'secondary' },
      'won': { label: 'Ganho', variant: 'default' },
      'lost': { label: 'Perdido', variant: 'destructive' },
    };
    
    const config = statusConfig[status] || statusConfig.open;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  return (
    <div className="border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Nome</TableHead>
            <TableHead className="w-[200px]">Empresa</TableHead>
            <TableHead className="w-[180px]">Contato</TableHead>
            <TableHead className="w-[150px]">Coluna</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[100px]">Valor</TableHead>
            <TableHead className="w-[150px]">Criado em</TableHead>
            <TableHead className="w-[100px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLeads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                {searchTerm ? "Nenhum lead encontrado com esse filtro" : "Nenhum lead cadastrado ainda"}
              </TableCell>
            </TableRow>
          ) : (
            filteredLeads.map((lead) => (
              <TableRow 
                key={lead.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onLeadClick(lead)}
              >
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{lead.full_name}</span>
                    {lead.external_id && (
                      <span className="text-xs text-muted-foreground">#{lead.external_id}</span>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    {lead.company_name ? (
                      <>
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{lead.company_name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {lead.email && (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{lead.email}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    {!lead.email && !lead.phone && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge 
                    style={{ 
                      backgroundColor: getStageColor(lead.stage_id),
                      color: '#fff'
                    }}
                  >
                    {getStageName(lead.stage_id)}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  {getStatusBadge(lead.status)}
                </TableCell>
                
                <TableCell>
                  {lead.value ? (
                    <span className="font-medium">
                      R$ {lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </TableCell>
                
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLeadClick(lead);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
