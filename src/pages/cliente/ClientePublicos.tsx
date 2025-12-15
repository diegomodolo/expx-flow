import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useMetaAudiences, MetaAudience } from "@/hooks/useMetaAudiences";
import { AudiencesList } from "@/components/audiences/AudiencesList";
import { CreateAudienceModal } from "@/components/audiences/CreateAudienceModal";
import { UploadLeadsModal } from "@/components/audiences/UploadLeadsModal";
import { AudienceDetailsModal } from "@/components/audiences/AudienceDetailsModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, RefreshCw, Users, AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

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
    error,
  } = useMetaAudiences(id || null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<MetaAudience | null>(null);

  useEffect(() => {
    if (id) {
      fetchAudiences(true);
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

  // Check if error is about missing Facebook integration
  const isFacebookNotConnected = error?.includes('Facebook integration not found') || 
                                  error?.includes('ad account') ||
                                  error?.includes('not have an ad account');

  if (isFacebookNotConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Públicos Personalizados
          </h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os públicos personalizados do Meta Ads para este cliente
          </p>
        </div>

        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 mb-4 text-amber-500" />
            <h4 className="text-lg font-medium mb-2">Integração Meta não configurada</h4>
            <p className="text-muted-foreground mb-4 max-w-md">
              Para gerenciar públicos personalizados, é necessário que a empresa tenha uma
              integração ativa com o Meta (Facebook) e que o cliente tenha uma conta de anúncios vinculada.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/configuracoes/integracoes">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Configurar Integração
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
