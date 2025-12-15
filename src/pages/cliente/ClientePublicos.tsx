import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useMetaAudiences, MetaAudience } from "@/hooks/useMetaAudiences";
import { AudiencesList } from "@/components/audiences/AudiencesList";
import { CreateAudienceModal } from "@/components/audiences/CreateAudienceModal";
import { UploadLeadsModal } from "@/components/audiences/UploadLeadsModal";
import { AudienceDetailsModal } from "@/components/audiences/AudienceDetailsModal";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Users } from "lucide-react";

export function ClientePublicos() {
  const { id } = useParams<{ id: string }>();
  const {
    loading,
    audiences,
    fetchAudiences,
    createAudience,
    deleteAudience,
    getAudienceDetails,
    addUsersToAudience,
  } = useMetaAudiences(id || null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<MetaAudience | null>(null);

  useEffect(() => {
    if (id) {
      fetchAudiences(true); // sync on mount
    }
  }, [id]);

  const handleCreateAudience = async (name: string, description?: string) => {
    const result = await createAudience(name, description);
    if (result) {
      setCreateModalOpen(false);
    }
  };

  const handleViewDetails = async (audience: MetaAudience) => {
    setSelectedAudience(audience);
    setDetailsModalOpen(true);
  };

  const handleUploadLeads = (audience: MetaAudience) => {
    setSelectedAudience(audience);
    setUploadModalOpen(true);
  };

  const handleDeleteAudience = async (audienceId: string) => {
    await deleteAudience(audienceId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Públicos Personalizados
          </h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os públicos personalizados do Meta Ads para este cliente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAudiences(true)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
          <Button size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Público
          </Button>
        </div>
      </div>

      <AudiencesList
        audiences={audiences}
        loading={loading}
        onViewDetails={handleViewDetails}
        onUploadLeads={handleUploadLeads}
        onDelete={handleDeleteAudience}
      />

      <CreateAudienceModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateAudience}
        loading={loading}
      />

      <UploadLeadsModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        audience={selectedAudience}
        onUpload={addUsersToAudience}
        loading={loading}
      />

      <AudienceDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        audience={selectedAudience}
        onFetchDetails={getAudienceDetails}
      />
    </div>
  );
}
