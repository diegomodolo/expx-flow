import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useClients } from "@/hooks/useClients";
import { useAdGenerationQueue } from "@/hooks/useAdGenerationQueue";
import { AdReviewGrid } from "@/components/ad-factory/AdReviewGrid";
import { BulkApprovalBar } from "@/components/ad-factory/BulkApprovalBar";
import { AdReviewFilters } from "@/components/ad-factory/AdReviewFilters";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, RefreshCw, Calendar, Upload } from "lucide-react";
import { toast } from "sonner";

export type AdGenerationType = "clone" | "concept" | "iteration";
export type AdGenerationStatus = "pending" | "approved" | "rejected" | "published";

export default function RevisaoDiaria() {
  const { clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<AdGenerationType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<AdGenerationStatus | "all">("pending");
  const [isPublishing, setIsPublishing] = useState(false);

  const {
    ads,
    isLoading,
    generateAds,
    isGenerating,
    updateAdStatus,
    bulkUpdateStatus,
    publishAds,
    refetch,
  } = useAdGenerationQueue(selectedClientId);

  const filteredAds = ads?.filter((ad) => {
    if (filterType !== "all" && ad.generation_type !== filterType) return false;
    if (filterStatus !== "all" && ad.status !== filterStatus) return false;
    return true;
  }) || [];

  const handleSelectAll = () => {
    if (selectedIds.length === filteredAds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAds.map((ad) => ad.id));
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    await bulkUpdateStatus(selectedIds, "approved");
    setSelectedIds([]);
    toast.success(`${selectedIds.length} anúncios aprovados`);
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    await bulkUpdateStatus(selectedIds, "rejected");
    setSelectedIds([]);
    toast.success(`${selectedIds.length} anúncios rejeitados`);
  };

  const handleGenerate = async () => {
    if (!selectedClientId) {
      toast.error("Selecione um cliente primeiro");
      return;
    }
    await generateAds(selectedClientId, { count: 10 });
  };

  const pendingCount = ads?.filter((ad) => ad.status === "pending").length || 0;
  const approvedCount = ads?.filter((ad) => ad.status === "approved").length || 0;

  const handlePublishApproved = async () => {
    if (approvedCount === 0) {
      toast.error("Nenhum anúncio aprovado para publicar");
      return;
    }
    setIsPublishing(true);
    try {
      await publishAds();
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Revisão Diária de Anúncios</h1>
              <p className="text-muted-foreground mt-1">
                Revise e aprove os anúncios gerados pela IA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedClientId || ""} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedClientId}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? "Gerando..." : "Gerar Anúncios"}
            </Button>
            {approvedCount > 0 && (
              <Button
                onClick={handlePublishApproved}
                disabled={isPublishing}
                variant="default"
                className="bg-gradient-to-r from-green-600 to-green-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isPublishing ? "Publicando..." : `Publicar ${approvedCount} Aprovados`}
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground">{ads?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Total Gerados</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
            <div className="text-sm text-muted-foreground">Pendentes</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-green-500">{approvedCount}</div>
            <div className="text-sm text-muted-foreground">Aprovados</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">Hoje</div>
              <div className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString("pt-BR")}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <AdReviewFilters
          filterType={filterType}
          filterStatus={filterStatus}
          onTypeChange={setFilterType}
          onStatusChange={setFilterStatus}
        />

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <BulkApprovalBar
            selectedCount={selectedIds.length}
            totalCount={filteredAds.length}
            onApprove={handleBulkApprove}
            onReject={handleBulkReject}
            onSelectAll={handleSelectAll}
            onClear={() => setSelectedIds([])}
          />
        )}

        {/* Grid */}
        <AdReviewGrid
          ads={filteredAds}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onApprove={(id) => updateAdStatus(id, "approved")}
          onReject={(id) => updateAdStatus(id, "rejected")}
          isLoading={isLoading}
        />
      </div>
    </DashboardLayout>
  );
}
