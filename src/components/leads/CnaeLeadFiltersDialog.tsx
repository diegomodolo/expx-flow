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
import { MapPin, Building2, DollarSign, Calendar, Mail, Phone, RotateCcw } from "lucide-react";

export interface CnaeLeadFilters {
  uf?: string;
  municipio?: string;
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
}: CnaeLeadFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<CnaeLeadFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, open]);

  const handleClearFilters = () => {
    setLocalFilters({});
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onOpenChange(false);
  };

  const countActiveFilters = () => {
    let count = 0;
    if (localFilters.uf) count++;
    if (localFilters.municipio) count++;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="uf">Estado (UF)</Label>
                <Select
                  value={localFilters.uf || ""}
                  onValueChange={(value) =>
                    setLocalFilters({ ...localFilters, uf: value || undefined })
                  }
                >
                  <SelectTrigger id="uf">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {ESTADOS_BR.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipio">Município</Label>
                <Input
                  id="municipio"
                  placeholder="Digite o município"
                  value={localFilters.municipio || ""}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, municipio: e.target.value || undefined })
                  }
                />
              </div>
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
                  value={localFilters.situacaoCadastral || ""}
                  onValueChange={(value) =>
                    setLocalFilters({ ...localFilters, situacaoCadastral: value || undefined })
                  }
                >
                  <SelectTrigger id="situacao">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
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
                  value={localFilters.porte || ""}
                  onValueChange={(value) =>
                    setLocalFilters({ ...localFilters, porte: value || undefined })
                  }
                >
                  <SelectTrigger id="porte">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
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
                  value={localFilters.simplesOption || ""}
                  onValueChange={(value) =>
                    setLocalFilters({ ...localFilters, simplesOption: value || undefined })
                  }
                >
                  <SelectTrigger id="simples">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
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
                  value={localFilters.meiOption || ""}
                  onValueChange={(value) =>
                    setLocalFilters({ ...localFilters, meiOption: value || undefined })
                  }
                >
                  <SelectTrigger id="mei">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
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
