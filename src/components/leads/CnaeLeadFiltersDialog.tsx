import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, DollarSign, Calendar, Mail, Phone, RotateCcw, X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CnaeLeadFilters {
  ufs?: string[];
  municipios?: string[];
  situacaoCadastral?: string;
  porte?: string;
  simplesOption?: string;
  meiOption?: string;
  capitalSocialMin?: number;
  capitalSocialMax?: number;
  dataAberturaFrom?: string;
  dataAberturaTo?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
}

interface CnaeLeadFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CnaeLeadFilters;
  onApplyFilters: (filters: CnaeLeadFilters) => void;
  companyId?: string;
  cnaeCode?: string;
}

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const SITUACAO_CADASTRAL_OPTIONS = [
  { value: "ATIVA", label: "Ativa" },
  { value: "BAIXADA", label: "Baixada" },
  { value: "SUSPENSA", label: "Suspensa" },
  { value: "INAPTA", label: "Inapta" },
  { value: "NULA", label: "Nula" },
];

const PORTE_OPTIONS = [
  { value: "MEI", label: "MEI" },
  { value: "ME", label: "Microempresa" },
  { value: "EPP", label: "Empresa de Pequeno Porte" },
  { value: "DEMAIS", label: "Demais" },
];

const SIM_NAO_OPTIONS = [
  { value: "SIM", label: "Sim" },
  { value: "NAO", label: "Não" },
];

export function CnaeLeadFiltersDialog({
  open,
  onOpenChange,
  filters,
  onApplyFilters,
  companyId,
  cnaeCode,
}: CnaeLeadFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<CnaeLeadFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, open]);

  // Fetch municipalities based on selected states
  const { data: availableMunicipios, isLoading: isLoadingMunicipios } = useQuery({
    queryKey: ['cnae-municipios', companyId, cnaeCode, localFilters.ufs],
    queryFn: async () => {
      if (!companyId || !cnaeCode) return [];
      
      let query = supabase
        .from('cnae_lead_pool' as any)
        .select('municipio, uf')
        .eq('company_id', companyId)
        .eq('cnae_code', cnaeCode)
        .not('municipio', 'is', null);

      // Filter by selected states if any
      if (localFilters.ufs && localFilters.ufs.length > 0) {
        query = query.in('uf', localFilters.ufs);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Get unique municipalities with their UF
      const municipiosMap = new Map<string, { municipio: string; uf: string }>();
      (data || []).forEach((item: any) => {
        if (item.municipio) {
          const key = `${item.municipio}-${item.uf}`;
          if (!municipiosMap.has(key)) {
            municipiosMap.set(key, { municipio: item.municipio, uf: item.uf });
          }
        }
      });

      return Array.from(municipiosMap.values())
        .sort((a, b) => a.municipio.localeCompare(b.municipio));
    },
    enabled: !!companyId && !!cnaeCode && open
  });

  const handleClearFilters = () => {
    setLocalFilters({});
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onOpenChange(false);
  };

  const toggleUf = (uf: string) => {
    const currentUfs = localFilters.ufs || [];
    let newUfs: string[];
    
    if (currentUfs.includes(uf)) {
      newUfs = currentUfs.filter(u => u !== uf);
    } else {
      newUfs = [...currentUfs, uf];
    }
    
    // When states change, clear municipios that are no longer valid
    const validMunicipios = (localFilters.municipios || []).filter(m => {
      const mData = availableMunicipios?.find(am => am.municipio === m);
      return mData && (newUfs.length === 0 || newUfs.includes(mData.uf));
    });

    setLocalFilters({
      ...localFilters,
      ufs: newUfs.length > 0 ? newUfs : undefined,
      municipios: validMunicipios.length > 0 ? validMunicipios : undefined
    });
  };

  const selectAllUfs = () => {
    setLocalFilters({
      ...localFilters,
      ufs: undefined,
      municipios: undefined
    });
  };

  const toggleMunicipio = (municipio: string) => {
    const currentMunicipios = localFilters.municipios || [];
    let newMunicipios: string[];
    
    if (currentMunicipios.includes(municipio)) {
      newMunicipios = currentMunicipios.filter(m => m !== municipio);
    } else {
      newMunicipios = [...currentMunicipios, municipio];
    }
    
    setLocalFilters({
      ...localFilters,
      municipios: newMunicipios.length > 0 ? newMunicipios : undefined
    });
  };

  const selectAllMunicipios = () => {
    setLocalFilters({
      ...localFilters,
      municipios: undefined
    });
  };

  const countActiveFilters = () => {
    let count = 0;
    if (localFilters.ufs && localFilters.ufs.length > 0) count++;
    if (localFilters.municipios && localFilters.municipios.length > 0) count++;
    if (localFilters.situacaoCadastral) count++;
    if (localFilters.porte) count++;
    if (localFilters.simplesOption) count++;
    if (localFilters.meiOption) count++;
    if (localFilters.capitalSocialMin) count++;
    if (localFilters.capitalSocialMax) count++;
    if (localFilters.dataAberturaFrom) count++;
    if (localFilters.dataAberturaTo) count++;
    if (localFilters.hasEmail) count++;
    if (localFilters.hasPhone) count++;
    return count;
  };

  const allUfsSelected = !localFilters.ufs || localFilters.ufs.length === 0;
  const allMunicipiosSelected = !localFilters.municipios || localFilters.municipios.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Filtros Avançados
          </DialogTitle>
          <DialogDescription>
            Refine sua busca de leads usando os filtros abaixo
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Localização */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Localização
            </div>
            
            {/* Estados */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Estados (UF)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllUfs}
                  className="h-7 text-xs"
                >
                  {allUfsSelected ? "Todos selecionados" : "Selecionar todos"}
                </Button>
              </div>
              
              {/* Selected states badges */}
              {localFilters.ufs && localFilters.ufs.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {localFilters.ufs.map(uf => (
                    <Badge
                      key={uf}
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => toggleUf(uf)}
                    >
                      {uf}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}

              <ScrollArea className="h-32 border rounded-md p-2">
                <div className="grid grid-cols-6 gap-2">
                  {ESTADOS_BR.map((uf) => {
                    const isSelected = localFilters.ufs?.includes(uf) || false;
                    const isAllSelected = allUfsSelected;
                    
                    return (
                      <div
                        key={uf}
                        className={`
                          flex items-center justify-center p-2 rounded-md cursor-pointer text-sm font-medium transition-colors
                          ${isSelected 
                            ? 'bg-primary text-primary-foreground' 
                            : isAllSelected 
                              ? 'bg-muted/50 text-foreground hover:bg-muted'
                              : 'bg-background border text-muted-foreground hover:bg-muted'
                          }
                        `}
                        onClick={() => toggleUf(uf)}
                      >
                        {uf}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Municípios */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Municípios
                  {isLoadingMunicipios && (
                    <Loader2 className="h-3 w-3 ml-2 inline animate-spin" />
                  )}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllMunicipios}
                  className="h-7 text-xs"
                >
                  {allMunicipiosSelected ? "Todos selecionados" : "Selecionar todos"}
                </Button>
              </div>

              {/* Selected municipios badges */}
              {localFilters.municipios && localFilters.municipios.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2 max-h-20 overflow-y-auto">
                  {localFilters.municipios.map(m => (
                    <Badge
                      key={m}
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => toggleMunicipio(m)}
                    >
                      {m}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}

              <ScrollArea className="h-40 border rounded-md p-2">
                {isLoadingMunicipios ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Carregando municípios...
                  </div>
                ) : !availableMunicipios || availableMunicipios.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Nenhum município encontrado
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    {availableMunicipios.map((item) => {
                      const isSelected = localFilters.municipios?.includes(item.municipio) || false;
                      const isAllSelected = allMunicipiosSelected;
                      
                      return (
                        <div
                          key={`${item.municipio}-${item.uf}`}
                          className={`
                            flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm transition-colors
                            ${isSelected 
                              ? 'bg-primary text-primary-foreground' 
                              : isAllSelected
                                ? 'bg-muted/50 text-foreground hover:bg-muted'
                                : 'bg-background border text-muted-foreground hover:bg-muted'
                            }
                          `}
                          onClick={() => toggleMunicipio(item.municipio)}
                        >
                          <span className="truncate flex-1">{item.municipio}</span>
                          <span className="text-xs opacity-70">{item.uf}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Situação da Empresa */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              Situação da Empresa
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="situacao">Situação Cadastral</Label>
                <Select
                  value={localFilters.situacaoCadastral || "ALL"}
                  onValueChange={(value) =>
                    setLocalFilters({ ...localFilters, situacaoCadastral: value === "ALL" ? undefined : value })
                  }
                >
                  <SelectTrigger id="situacao">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas</SelectItem>
                    {SITUACAO_CADASTRAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="porte">Porte</Label>
                <Select
                  value={localFilters.porte || "ALL"}
                  onValueChange={(value) =>
                    setLocalFilters({ ...localFilters, porte: value === "ALL" ? undefined : value })
                  }
                >
                  <SelectTrigger id="porte">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    {PORTE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="simples">Simples Nacional</Label>
                <Select
                  value={localFilters.simplesOption || "ALL"}
                  onValueChange={(value) =>
                    setLocalFilters({ ...localFilters, simplesOption: value === "ALL" ? undefined : value })
                  }
                >
                  <SelectTrigger id="simples">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    {SIM_NAO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mei">MEI</Label>
                <Select
                  value={localFilters.meiOption || "ALL"}
                  onValueChange={(value) =>
                    setLocalFilters({ ...localFilters, meiOption: value === "ALL" ? undefined : value })
                  }
                >
                  <SelectTrigger id="mei">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    {SIM_NAO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Capital Social */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <DollarSign className="h-4 w-4 text-primary" />
              Capital Social
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capitalMin">Mínimo (R$)</Label>
                <Input
                  id="capitalMin"
                  type="number"
                  placeholder="0,00"
                  value={localFilters.capitalSocialMin || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      capitalSocialMin: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capitalMax">Máximo (R$)</Label>
                <Input
                  id="capitalMax"
                  type="number"
                  placeholder="Sem limite"
                  value={localFilters.capitalSocialMax || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      capitalSocialMax: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Data de Abertura */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              Data de Abertura
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataFrom">De</Label>
                <Input
                  id="dataFrom"
                  type="date"
                  value={localFilters.dataAberturaFrom || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      dataAberturaFrom: e.target.value || undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataTo">Até</Label>
                <Input
                  id="dataTo"
                  type="date"
                  value={localFilters.dataAberturaTo || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      dataAberturaTo: e.target.value || undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              Informações de Contato
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasEmail"
                  checked={localFilters.hasEmail || false}
                  onCheckedChange={(checked) =>
                    setLocalFilters({
                      ...localFilters,
                      hasEmail: checked ? true : undefined,
                    })
                  }
                />
                <Label htmlFor="hasEmail" className="flex items-center gap-2 cursor-pointer">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Possui Email
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasPhone"
                  checked={localFilters.hasPhone || false}
                  onCheckedChange={(checked) =>
                    setLocalFilters({
                      ...localFilters,
                      hasPhone: checked ? true : undefined,
                    })
                  }
                />
                <Label htmlFor="hasPhone" className="flex items-center gap-2 cursor-pointer">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Possui Telefone
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar Filtros
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApply}>
              Aplicar Filtros
              {countActiveFilters() > 0 && (
                <span className="ml-2 bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs">
                  {countActiveFilters()}
                </span>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
