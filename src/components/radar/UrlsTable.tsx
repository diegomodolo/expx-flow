import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  HelpCircle,
  FileX2
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
          <Badge variant="outline" className="text-green-600 dark:text-green-500 border-green-600 text-[10px] h-5 px-1.5">
            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
            OK
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
            <XCircle className="h-2.5 w-2.5 mr-0.5" />
            Erro
          </Badge>
        );
      case 'timeout':
        return (
          <Badge variant="outline" className="text-orange-600 dark:text-orange-500 border-orange-600 text-[10px] h-5 px-1.5">
            <Clock className="h-2.5 w-2.5 mr-0.5" />
            Timeout
          </Badge>
        );
      case 'redirect':
        return (
          <Badge variant="outline" className="text-blue-600 dark:text-blue-500 border-blue-600 text-[10px] h-5 px-1.5">
            <ArrowRightLeft className="h-2.5 w-2.5 mr-0.5" />
            Redir
          </Badge>
        );
      case 'empty':
        return (
          <Badge variant="outline" className="text-purple-600 dark:text-purple-500 border-purple-600 text-[10px] h-5 px-1.5">
            <FileX2 className="h-2.5 w-2.5 mr-0.5" />
            Vazio
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            <HelpCircle className="h-2.5 w-2.5 mr-0.5" />
            Pend
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
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Link2 className="h-3.5 w-3.5" />
            Todas as URLs
            <Badge variant="secondary" className="ml-1 h-5 text-xs">
              {filteredUrls.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-7 h-8 w-[140px] lg:w-[200px] text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[100px] lg:w-[120px] h-8 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
                <SelectItem value="redirect">Redirect</SelectItem>
                <SelectItem value="empty">Vazio</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <ScrollArea className="w-full">
          <div className="rounded-md border min-w-[700px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs py-2 w-[120px]">Cliente</TableHead>
                  <TableHead className="text-xs py-2">URL</TableHead>
                  <TableHead className="text-xs py-2 w-[70px]">Status</TableHead>
                  <TableHead className="text-xs py-2 w-[50px]">Cód</TableHead>
                  <TableHead className="text-xs py-2 w-[60px]">Tempo</TableHead>
                  <TableHead className="text-xs py-2 w-[50px]">Camp.</TableHead>
                  <TableHead className="text-xs py-2 w-[90px]">Validação</TableHead>
                  <TableHead className="text-xs py-2 w-[60px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUrls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-xs text-muted-foreground">
                      Nenhuma URL encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUrls.slice(0, 100).map((url) => (
                    <TableRow key={url.id}>
                      <TableCell className="py-1.5 text-xs font-medium truncate max-w-[120px]" title={url.client_name}>
                        {url.client_name}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <p className="truncate text-xs max-w-[200px]" title={url.url}>
                          {url.url}
                        </p>
                      </TableCell>
                      <TableCell className="py-1.5">
                        {getStatusBadge(url.validation_status)}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className="text-xs font-mono">
                          {url.validation_status_code || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className={`text-xs font-mono ${
                          url.validation_load_time_ms && url.validation_load_time_ms > 3000 
                            ? 'text-orange-600 dark:text-orange-500 font-medium' 
                            : ''
                        }`}>
                          {formatResponseTime(url.validation_load_time_ms)}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span 
                          className={`text-xs font-mono ${
                            url.active_campaign_count && url.active_campaign_count > 0 
                              ? 'text-green-600 dark:text-green-500' 
                              : 'text-muted-foreground'
                          }`}
                          title={`${url.active_campaign_count ?? 0} campanhas ativas de ${url.total_campaign_count ?? 0} total`}
                        >
                          {url.active_campaign_count ?? 0}/{url.total_campaign_count ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          {url.last_validated_at 
                            ? formatDistanceToNow(new Date(url.last_validated_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })
                            : 'Nunca'
                          }
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onValidate(url.id)}
                            disabled={isValidating}
                            title="Validar"
                          >
                            <RefreshCw className={`h-3 w-3 ${isValidating ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
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
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        {filteredUrls.length > 100 && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Mostrando 100 de {filteredUrls.length} URLs
          </p>
        )}
      </CardContent>
    </Card>
  );
}
