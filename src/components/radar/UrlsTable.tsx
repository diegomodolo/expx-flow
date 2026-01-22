import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { 
  Link2, 
  Search, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowRightLeft,
  HelpCircle
} from "lucide-react";
import { RadarUrl, ValidationStatus } from "@/hooks/useRadarUrls";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UrlsTableProps {
  urls: RadarUrl[];
  onValidate: (urlId: string) => void;
  isValidating: boolean;
  onFilterChange: (filters: { status?: ValidationStatus | 'all'; search?: string }) => void;
}

export function UrlsTable({ urls, onValidate, isValidating, onFilterChange }: UrlsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange({ search: value });
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    onFilterChange({ status: value as ValidationStatus | 'all' });
  };

  const filteredUrls = urls.filter(url => {
    const matchesSearch = !search || 
      url.url.toLowerCase().includes(search.toLowerCase()) ||
      url.client_name.toLowerCase().includes(search.toLowerCase()) ||
      url.label?.toLowerCase().includes(search.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case 'ok':
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            OK
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      case 'timeout':
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            <Clock className="h-3 w-3 mr-1" />
            Timeout
          </Badge>
        );
      case 'redirect':
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Redirect
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <HelpCircle className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  const formatResponseTime = (ms: number | null) => {
    if (!ms) return '-';
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" />
            Todas as URLs
            <Badge variant="secondary" className="ml-2">
              {filteredUrls.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar URL ou cliente..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 w-[250px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
                <SelectItem value="redirect">Redirect</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead>Última Validação</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUrls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma URL encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredUrls.slice(0, 100).map((url) => (
                  <TableRow key={url.id}>
                    <TableCell className="font-medium">
                      {url.client_name}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="truncate text-sm" title={url.url}>
                        {url.url}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {url.label || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(url.validation_status)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {url.validation_http_code || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm ${
                        url.validation_response_time_ms && url.validation_response_time_ms > 3000 
                          ? 'text-orange-600 font-medium' 
                          : ''
                      }`}>
                        {formatResponseTime(url.validation_response_time_ms)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {url.last_validated_at 
                          ? formatDistanceToNow(new Date(url.last_validated_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })
                          : 'Nunca'
                        }
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onValidate(url.id)}
                          disabled={isValidating}
                          title="Validar"
                        >
                          <RefreshCw className={`h-3 w-3 ${isValidating ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          asChild
                          title="Abrir URL"
                        >
                          <a href={url.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filteredUrls.length > 100 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Mostrando 100 de {filteredUrls.length} URLs
          </p>
        )}
      </CardContent>
    </Card>
  );
}
