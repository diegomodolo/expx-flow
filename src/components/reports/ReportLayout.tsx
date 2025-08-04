import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, FileText, Printer, Plus, Minus, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'date' | 'daterange' | 'input';
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}

interface ReportLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  onExportPDF?: () => void;
  onSendEmail?: () => void;
  primaryFilters?: FilterConfig[];
  secondaryFilters?: FilterConfig[];
  onFilterChange?: (filterId: string, value: string) => void;
  filterDescription?: string;
}

export function ReportLayout({ 
  title, 
  description, 
  children, 
  onExportPDF, 
  onSendEmail,
  primaryFilters = [],
  secondaryFilters = [],
  onFilterChange,
  filterDescription
}: ReportLayoutProps) {
  const navigate = useNavigate();
  const [showExtraFilters, setShowExtraFilters] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedDates, setSelectedDates] = useState<Record<string, Date | undefined>>({});

  const handleFilterChange = (filterId: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [filterId]: value }));
    onFilterChange?.(filterId, value);
  };

  const renderFilter = (filter: FilterConfig) => {
    switch (filter.type) {
      case 'select':
        return (
          <div key={filter.id} className="space-y-2">
            <Label htmlFor={filter.id} className="text-xs font-medium">{filter.label}</Label>
            <Select onValueChange={(value) => handleFilterChange(filter.id, value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={filter.placeholder || `Selecione ${filter.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {filter.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case 'input':
        return (
          <div key={filter.id} className="space-y-2">
            <Label htmlFor={filter.id} className="text-xs font-medium">{filter.label}</Label>
            <Input
              id={filter.id}
              placeholder={filter.placeholder}
              className="h-8 text-xs"
              onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            />
          </div>
        );
      
      case 'date':
        return (
          <div key={filter.id} className="space-y-2">
            <Label htmlFor={filter.id} className="text-xs font-medium">{filter.label}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-8 text-xs justify-start text-left font-normal",
                    !selectedDates[filter.id] && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-3 w-3" />
                  {selectedDates[filter.id] ? format(selectedDates[filter.id]!, "dd/MM/yyyy") : filter.placeholder}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDates[filter.id]}
                  onSelect={(date) => {
                    setSelectedDates(prev => ({ ...prev, [filter.id]: date }));
                    if (date) {
                      handleFilterChange(filter.id, format(date, "yyyy-MM-dd"));
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        {/* Header Section */}
        <div className="space-y-6">
          {/* Title and Actions */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/relatorios")}
                className="text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
              {onExportPDF && (
                <Button variant="outline" size="sm" onClick={onExportPDF}>
                  <FileText className="w-4 h-4 mr-1" />
                  PDF
                </Button>
              )}
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1" />
                Imprimir
              </Button>
            </div>
          </div>

          {/* Filters Section */}
          {(primaryFilters.length > 0 || secondaryFilters.length > 0) && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Filtros</h3>
                  {filterDescription && (
                    <p className="text-xs text-muted-foreground">{filterDescription}</p>
                  )}
                  
                  {/* Primeira linha de filtros */}
                  <div className="flex items-end gap-4 flex-wrap">
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 flex-1">
                      {primaryFilters.map(renderFilter)}
                    </div>

                    {/* Botão + Filtros */}
                    {secondaryFilters.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowExtraFilters(!showExtraFilters)}
                        className="h-8"
                      >
                        {showExtraFilters ? (
                          <>
                            <Minus className="w-3 h-3 mr-1" />
                            Filtros
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 mr-1" />
                            Filtros
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Segunda linha de filtros (condicional) */}
                  {showExtraFilters && secondaryFilters.length > 0 && (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
                      {secondaryFilters.map(renderFilter)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {children}
      </div>
    </DashboardLayout>
  );
}