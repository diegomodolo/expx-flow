import { useState } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRadarUrls, ValidationStatus } from "@/hooks/useRadarUrls";
import { UrlsKPIHeader } from "@/components/radar/UrlsKPIHeader";
import { ProblematicUrlsCard } from "@/components/radar/ProblematicUrlsCard";
import { SlowUrlsCard } from "@/components/radar/SlowUrlsCard";
import { RedirectUrlsCard } from "@/components/radar/RedirectUrlsCard";
import { UrlsTable } from "@/components/radar/UrlsTable";

const RadarUrlsDashboard = () => {
  const [filters, setFilters] = useState<{ status?: ValidationStatus | 'all'; search?: string }>({});
  
  const { 
    urls, 
    stats, 
    problematicUrls, 
    slowUrls, 
    redirectUrls,
    isLoading, 
    refetch,
    validateUrl,
    validateAll,
    validateProblematic,
    isValidating
  } = useRadarUrls();

  // Filter URLs based on table filters
  const getFilteredUrls = () => {
    let filtered = urls;
    
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'pending') {
        filtered = filtered.filter(u => !u.validation_status || u.validation_status === 'pending');
      } else {
        filtered = filtered.filter(u => u.validation_status === filters.status);
      }
    }
    
    return filtered;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Carregando URLs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Radar de URLs</h1>
          <p className="text-sm text-muted-foreground">
            Monitoramento da saúde das URLs de destino dos clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isValidating}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button 
            size="sm" 
            onClick={() => validateAll()}
            disabled={isValidating}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
            Validar Todas
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <UrlsKPIHeader stats={stats} />

      {/* Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ProblematicUrlsCard 
          urls={problematicUrls}
          onValidate={validateUrl}
          onValidateAll={validateProblematic}
          isValidating={isValidating}
        />
        <SlowUrlsCard urls={slowUrls} />
        <RedirectUrlsCard urls={redirectUrls} />
      </div>

      {/* Table */}
      <UrlsTable 
        urls={getFilteredUrls()}
        onValidate={validateUrl}
        isValidating={isValidating}
        onFilterChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
      />
    </div>
  );
};

export default RadarUrlsDashboard;
