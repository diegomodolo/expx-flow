import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Users, 
  Search, 
  Eye,
  Edit,
  Phone,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Settings,
  ThumbsUp,
  Minus,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCSClientsList, CSClientListItem } from '@/hooks/useCSClientsList';
import { CSNewTouchpointModal } from '@/components/cs/CSNewTouchpointModal';
import { useCSSquadFilter } from '@/contexts/CSSquadFilterContext';
import { CSSquadFilter } from '@/components/cs/CSSquadFilter';

type SortField = 'name' | 'healthScore' | 'churnRiskLevel' | 'npsScore' | 'lastTouchpointAt' | 'activeCampaigns' | 'onboardingStatus' | 'squadName';
type SortDirection = 'asc' | 'desc';

const riskConfig = {
  critical: { label: 'Crítico', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400' },
  high: { label: 'Alto', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400' },
  medium: { label: 'Médio', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400' },
  low: { label: 'Baixo', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400' },
};

const onboardingConfig = {
  pending: { label: 'Pendente', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' },
};

function getHealthScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function NPSIcon({ category }: { category: 'promoter' | 'passive' | 'detractor' | null }) {
  if (!category) return <span className="text-muted-foreground">-</span>;
  
  const icons = {
    promoter: <ThumbsUp className="h-4 w-4 text-green-500" />,
    passive: <Minus className="h-4 w-4 text-yellow-500" />,
    detractor: <ThumbsDown className="h-4 w-4 text-red-500" />,
  };
  
  return icons[category];
}

export default function CSClientsList() {
  const navigate = useNavigate();
  const { selectedSquadId } = useCSSquadFilter();
  const { clients, isLoading, refetch } = useCSClientsList(selectedSquadId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [onboardingFilter, setOnboardingFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('healthScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Dialog states
  const [selectedClient, setSelectedClient] = useState<CSClientListItem | null>(null);
  const [touchpointModalOpen, setTouchpointModalOpen] = useState(false);
  
  const itemsPerPage = 10;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const filteredAndSortedClients = useMemo(() => {
    let result = [...clients];
    
    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(term) || 
        c.company.toLowerCase().includes(term)
      );
    }
    
    // Filter by risk
    if (riskFilter !== 'all') {
      result = result.filter(c => c.churnRiskLevel === riskFilter);
    }
    
    // Filter by onboarding
    if (onboardingFilter !== 'all') {
      result = result.filter(c => c.onboardingStatus === onboardingFilter);
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'healthScore':
          comparison = a.healthScore - b.healthScore;
          break;
        case 'churnRiskLevel':
          const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          comparison = riskOrder[a.churnRiskLevel] - riskOrder[b.churnRiskLevel];
          break;
        case 'npsScore':
          comparison = (a.npsScore || 0) - (b.npsScore || 0);
          break;
        case 'lastTouchpointAt':
          comparison = (a.daysSinceLastContact || 999) - (b.daysSinceLastContact || 999);
          break;
        case 'activeCampaigns':
          comparison = a.activeCampaigns - b.activeCampaigns;
          break;
        case 'onboardingStatus':
          const onboardingOrder = { pending: 0, in_progress: 1, completed: 2 };
          comparison = onboardingOrder[a.onboardingStatus] - onboardingOrder[b.onboardingStatus];
          break;
        case 'squadName':
          comparison = (a.squadName || '').localeCompare(b.squadName || '');
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [clients, searchTerm, riskFilter, onboardingFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage);
  const paginatedClients = filteredAndSortedClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleViewClient = (clientId: string) => {
    navigate(`/clientes/${clientId}/cs`);
  };

  const handleEditClient = (client: CSClientListItem) => {
    navigate(`/clientes/${client.clientId}`);
  };

  const handleRegisterTouchpoint = (client: CSClientListItem) => {
    setSelectedClient(client);
    setTouchpointModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Clientes CS
          </h1>
          <p className="text-muted-foreground">
            Lista de clientes com foco em Customer Success
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredAndSortedClients.length} clientes
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <CSSquadFilter />
            
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Risco de Churn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os riscos</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="low">Baixo</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={onboardingFilter} onValueChange={setOnboardingFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Onboarding" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort('name')}
                  >
                    Cliente {getSortIcon('name')}
                  </button>
                </TableHead>
                <TableHead className="w-[120px]">
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort('squadName')}
                  >
                    Squad {getSortIcon('squadName')}
                  </button>
                </TableHead>
                <TableHead className="w-[140px]">
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort('healthScore')}
                  >
                    Health Score {getSortIcon('healthScore')}
                  </button>
                </TableHead>
                <TableHead className="w-[100px]">
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort('churnRiskLevel')}
                  >
                    Risco {getSortIcon('churnRiskLevel')}
                  </button>
                </TableHead>
                <TableHead className="w-[80px]">
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort('npsScore')}
                  >
                    NPS {getSortIcon('npsScore')}
                  </button>
                </TableHead>
                <TableHead className="w-[130px]">
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort('lastTouchpointAt')}
                  >
                    Último Contato {getSortIcon('lastTouchpointAt')}
                  </button>
                </TableHead>
                <TableHead className="w-[100px]">
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort('activeCampaigns')}
                  >
                    Campanhas {getSortIcon('activeCampaigns')}
                  </button>
                </TableHead>
                <TableHead className="w-[130px]">
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort('onboardingStatus')}
                  >
                    Onboarding {getSortIcon('onboardingStatus')}
                  </button>
                </TableHead>
                <TableHead className="w-[80px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <div className="animate-pulse h-12 bg-muted/50 rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedClients.map((client) => (
                <TableRow key={client.clientId} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={client.avatar || undefined} />
                          <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.company}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.squadName ? (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ 
                            borderColor: client.squadColor || undefined,
                            backgroundColor: client.squadColor ? `${client.squadColor}20` : undefined 
                          }}
                        >
                          <Building2 className="h-3 w-3 mr-1" />
                          {client.squadName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{client.healthScore}%</span>
                        </div>
                        <Progress 
                          value={client.healthScore} 
                          className={cn("h-2", getHealthScoreColor(client.healthScore))}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border", riskConfig[client.churnRiskLevel].color)}>
                        {riskConfig[client.churnRiskLevel].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <NPSIcon category={client.npsCategory} />
                        <span className="text-sm">{client.npsScore ?? '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.daysSinceLastContact !== null ? (
                        <span className={cn(
                          "text-sm",
                          client.daysSinceLastContact > 14 && "text-destructive font-medium"
                        )}>
                          {client.daysSinceLastContact} dias atrás
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{client.activeCampaigns}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={onboardingConfig[client.onboardingStatus].color}>
                        {onboardingConfig[client.onboardingStatus].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewClient(client.clientId)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver CS
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClient(client)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Cliente
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRegisterTouchpoint(client)}>
                            <Phone className="h-4 w-4 mr-2" />
                            Registrar Touchpoint
                          </DropdownMenuItem>
                          {!client.hasHealthConfig && (
                            <DropdownMenuItem onClick={() => navigate(`/clientes/${client.clientId}/cs`)}>
                              <Settings className="h-4 w-4 mr-2" />
                              Configurar Health Score
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedClients.length)} de {filteredAndSortedClients.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}


      {/* Touchpoint Modal */}
      {selectedClient && (
        <CSNewTouchpointModal
          open={touchpointModalOpen}
          onOpenChange={setTouchpointModalOpen}
          clientId={selectedClient.clientId}
          clientName={selectedClient.name}
        />
      )}
    </div>
  );
}
