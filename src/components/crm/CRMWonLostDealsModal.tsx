import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Mail, Phone, Building2, DollarSign, Trophy, XCircle, Search, CalendarIcon, X, Filter } from "lucide-react";
import { CRMDeal } from "@/hooks/useCRMDeals";
import { format, formatDistanceToNow, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CRMWonLostDealsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deals: CRMDeal[];
  type: "won" | "lost";
  stageName: string;
  onDealClick: (deal: CRMDeal) => void;
}

export function CRMWonLostDealsModal({
  isOpen,
  onClose,
  deals,
  type,
  stageName,
  onDealClick,
}: CRMWonLostDealsModalProps) {
  const isWon = type === "won";
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      const contact = deal.contact;
      const searchLower = searchTerm.toLowerCase();
      
      // Text search
      if (searchTerm) {
        const matchesName = deal.title.toLowerCase().includes(searchLower);
        const matchesContactName = contact?.full_name?.toLowerCase().includes(searchLower) || false;
        const matchesEmail = contact?.email?.toLowerCase().includes(searchLower) || false;
        const matchesPhone = contact?.phone?.includes(searchTerm) || false;
        const matchesCompany = contact?.company_name?.toLowerCase().includes(searchLower) || false;
        
        if (!matchesName && !matchesContactName && !matchesEmail && !matchesPhone && !matchesCompany) {
          return false;
        }
      }
      
      // Date filters based on stage_entered_at
      const enteredAt = deal.stage_entered_at ? new Date(deal.stage_entered_at) : null;
      
      if (dateFrom && enteredAt) {
        if (isBefore(enteredAt, startOfDay(dateFrom))) {
          return false;
        }
      }
      
      if (dateTo && enteredAt) {
        if (isAfter(enteredAt, endOfDay(dateTo))) {
          return false;
        }
      }
      
      return true;
    });
  }, [deals, searchTerm, dateFrom, dateTo]);

  const totalValue = filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const hasActiveFilters = searchTerm || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchTerm("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isWon ? (
              <Trophy className="w-6 h-6 text-emerald-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
            {stageName}
          </DialogTitle>
        </DialogHeader>

        {/* Summary stats */}
        <div className="flex items-center gap-6 py-3 border-b">
          <div className="text-sm">
            <span className="text-muted-foreground">Total de negócios:</span>{" "}
            <span className="font-semibold text-foreground">{filteredDeals.length}</span>
            {filteredDeals.length !== deals.length && (
              <span className="text-muted-foreground"> de {deals.length}</span>
            )}
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Valor total:</span>{" "}
            <span className={cn("font-semibold", isWon ? "text-emerald-600" : "text-red-600")}>
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Search and filters */}
        <div className="space-y-3 py-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail, telefone, empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
                <X className="w-4 h-4 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label className="text-xs">Data de entrada (de)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Data de entrada (até)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        {/* Deals list */}
        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-3 pb-4">
            {filteredDeals.map((deal) => {
              const contact = deal.contact;
              const contactName = contact?.full_name || deal.title;
              const enteredAt = deal.stage_entered_at ? new Date(deal.stage_entered_at) : null;

              return (
                <Card
                  key={deal.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    onDealClick(deal);
                    onClose();
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <Avatar className="w-12 h-12 shrink-0">
                        {deal.responsible?.avatar_url && (
                          <AvatarImage src={deal.responsible.avatar_url} alt={deal.responsible.full_name} />
                        )}
                        <AvatarFallback className={isWon ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                          {deal.responsible ? getInitials(deal.responsible.full_name) : getInitials(contactName)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-base truncate">{deal.title}</p>
                            {contact && contact.full_name !== deal.title && (
                              <p className="text-sm text-muted-foreground truncate">{contact.full_name}</p>
                            )}
                          </div>

                          {/* Value */}
                          {deal.value && (
                            <div className={cn(
                              "flex items-center gap-1 text-base font-semibold shrink-0",
                              isWon ? "text-emerald-600" : "text-red-600"
                            )}>
                              <DollarSign className="w-4 h-4" />
                              R$ {deal.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>

                        {/* Contact info */}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {contact?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {contact.phone}
                            </span>
                          )}
                          {contact?.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {contact.email}
                            </span>
                          )}
                          {contact?.company_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {contact.company_name}
                            </span>
                          )}
                        </div>

                        {/* Date entered stage */}
                        <div className="mt-3 pt-2 border-t flex items-center gap-4">
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            isWon ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" 
                                 : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                          )}>
                            {isWon ? "Ganho" : "Perdido"}
                          </Badge>
                          
                          {enteredAt && (
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-medium">
                                {format(enteredAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                              <span className="text-muted-foreground">
                                ({formatDistanceToNow(enteredAt, { addSuffix: true, locale: ptBR })})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredDeals.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {hasActiveFilters ? (
                  <>
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Nenhum negócio encontrado com os filtros aplicados</p>
                    <Button variant="link" onClick={clearFilters} className="mt-2">
                      Limpar filtros
                    </Button>
                  </>
                ) : (
                  <>
                    {isWon ? (
                      <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    ) : (
                      <XCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    )}
                    <p>Nenhum negócio {isWon ? 'ganho' : 'perdido'} nesta coluna</p>
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}