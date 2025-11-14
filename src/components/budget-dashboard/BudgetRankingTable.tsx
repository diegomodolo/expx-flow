import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ExternalLink, Search } from "lucide-react";
import { BudgetClient } from "@/hooks/useBudgetAnalysis";
import { useNavigate } from "react-router-dom";

interface BudgetRankingTableProps {
  clients: BudgetClient[];
}

type SortField = 'name' | 'budget' | 'spend' | 'utilization' | 'projection';
type SortDirection = 'asc' | 'desc';

export function BudgetRankingTable({ clients }: BudgetRankingTableProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('utilization');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (client: BudgetClient) => {
    switch (client.status) {
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      case 'warning':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Atenção</Badge>;
      case 'healthy':
        return <Badge className="bg-green-500 hover:bg-green-600">Saudável</Badge>;
      case 'no-budget':
        return <Badge variant="secondary">Sem orçamento</Badge>;
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter and sort clients
  const filteredClients = clients
    .filter(client => 
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.company.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let compareA: number, compareB: number;
      
      switch (sortField) {
        case 'name':
          return sortDirection === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case 'budget':
          compareA = a.monthlyBudget;
          compareB = b.monthlyBudget;
          break;
        case 'spend':
          compareA = a.currentSpend;
          compareB = b.currentSpend;
          break;
        case 'utilization':
          compareA = a.utilizationPercentage;
          compareB = b.utilizationPercentage;
          break;
        case 'projection':
          compareA = a.projectedMonthSpend;
          compareB = b.projectedMonthSpend;
          break;
        default:
          return 0;
      }
      
      return sortDirection === 'asc' ? compareA - compareB : compareB - compareA;
    });

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-base">Ranking Completo de Clientes</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Cliente</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('budget')} className="h-8 px-2">
                    Orçamento <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('spend')} className="h-8 px-2">
                    Gasto Atual <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('utilization')} className="h-8 px-2">
                    Utilização <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('projection')} className="h-8 px-2">
                    Projeção <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={client.avatar} alt={client.name} />
                          <AvatarFallback>{client.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{client.name}</div>
                          <div className="text-xs text-muted-foreground">{client.company}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.monthlyBudget > 0 ? formatCurrency(client.monthlyBudget) : '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(client.currentSpend)}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        client.utilizationPercentage > 100 ? 'text-red-600' :
                        client.utilizationPercentage >= 90 ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        {client.monthlyBudget > 0 ? `${client.utilizationPercentage.toFixed(1)}%` : '-'}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(client)}</TableCell>
                    <TableCell className="text-sm">{client.syncPeriod} dias</TableCell>
                    <TableCell>
                      {client.monthlyBudget > 0 ? (
                        <div className="text-sm">
                          <div>{formatCurrency(client.projectedMonthSpend)}</div>
                          {client.willExceedBudget && (
                            <div className="text-xs text-red-600">
                              +{formatCurrency(client.projectedOverage)}
                            </div>
                          )}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/cliente/${client.id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredClients.length)} de {filteredClients.length} clientes
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
