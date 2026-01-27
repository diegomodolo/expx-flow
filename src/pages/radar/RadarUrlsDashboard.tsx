import { useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useRadarUrls, ValidationStatus } from "@/hooks/useRadarUrls";
import { UrlsKPIHeader } from "@/components/radar/UrlsKPIHeader";
import { ProblematicUrlsCard } from "@/components/radar/ProblematicUrlsCard";
import { SlowUrlsCard } from "@/components/radar/SlowUrlsCard";
import { RedirectUrlsCard } from "@/components/radar/RedirectUrlsCard";
import { EmptyUrlsCard } from "@/components/radar/EmptyUrlsCard";
import { SuspiciousUrlsCard } from "@/components/radar/SuspiciousUrlsCard";
import { UrlsTable } from "@/components/radar/UrlsTable";

const RadarUrlsDashboard = () => {
  const [filters, setFilters] = useState<{ status?: ValidationStatus | 'all'; search?: string }>({});
  const [onlyActiveCampaigns, setOnlyActiveCampaigns] = useState(true);
  const [includeManualUrls, setIncludeManualUrls] = useState(true);
  
  const { 
    urls, 
    stats, 
    problematicUrls, 
    slowUrls, 
    redirectUrls,
    emptyUrls,
    suspiciousUrls,
    isLoading, 
    refetch,
    validateUrl,
    validateAll,
    validateProblematic,
    isValidating,
    analyzeContent,
    analyzeAllContent,
    analyzeSuspicious,
    isAnalyzing
  } = useRadarUrls({ onlyActiveCampaigns, includeManualUrls });

  // Validate empty URLs
  const validateEmptyUrls = () => {
    emptyUrls.forEach(url => validateUrl(url.id));
  };

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
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Carregando URLs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header - Compact */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg lg:text-xl font-bold text-foreground truncate">Radar de URLs</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Monitoramento da saúde das URLs de destino
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Filter toggles */}
          <div className="flex items-center gap-3 mr-2 px-2 py-1 rounded-md bg-muted/50">
            <div className="flex items-center gap-1.5">
              <Switch
                id="active-campaigns"
                checked={onlyActiveCampaigns}
                onCheckedChange={setOnlyActiveCampaigns}
                className="scale-75"
              />
              <Label 
                htmlFor="active-campaigns" 
                className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap"
              >
                <span className="hidden sm:inline">Só ativas</span>
                <span className="sm:hidden">Ativas</span>
              </Label>
            </div>
            {onlyActiveCampaigns && (
              <div className="flex items-center gap-1.5 border-l pl-3 border-border/50">
                <Switch
                  id="include-manual"
                  checked={includeManualUrls}
                  onCheckedChange={setIncludeManualUrls}
                  className="scale-75"
                />
                <Label 
                  htmlFor="include-manual" 
                  className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap"
                >
                  <span className="hidden sm:inline">+ Manuais</span>
                  <span className="sm:hidden">Manuais</span>
                </Label>
              </div>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isValidating}
            className="h-8 px-2 lg:px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline ml-1.5">Atualizar</span>
          </Button>
          <Button 
            size="sm" 
            onClick={() => validateAll()}
            disabled={isValidating}
            className="h-8 px-2 lg:px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline ml-1.5">Validar</span>
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => analyzeAllContent()}
            disabled={isAnalyzing}
            className="h-8 px-2 lg:px-3"
          >
            <Search className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline ml-1.5">Analisar Conteúdo</span>
          </Button>
        </div>
      </div>

      {/* KPIs - Compact */}
      <UrlsKPIHeader stats={stats} />

      {/* Cards Row - 2 columns on medium, 5 on large */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <ProblematicUrlsCard 
          urls={problematicUrls}
          onValidate={validateUrl}
          onValidateAll={validateProblematic}
          isValidating={isValidating}
        />
        <SuspiciousUrlsCard 
          urls={suspiciousUrls}
          onAnalyze={analyzeContent}
          onAnalyzeAll={analyzeSuspicious}
          isAnalyzing={isAnalyzing}
        />
        <SlowUrlsCard urls={slowUrls} />
        <RedirectUrlsCard urls={redirectUrls} />
        <EmptyUrlsCard 
          urls={emptyUrls}
          onValidate={validateUrl}
          onValidateAll={validateEmptyUrls}
          isValidating={isValidating}
        />
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
