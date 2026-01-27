import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Phone, AlertCircle } from "lucide-react";
import { WhatsAppInstance, useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { WhatsAppInstanceCard } from "./WhatsAppInstanceCard";
import { WhatsAppInstanceModal } from "./WhatsAppInstanceModal";
import { WhatsAppInstanceUsersModal } from "./WhatsAppInstanceUsersModal";

interface WhatsAppInstancesListProps {
  companyId: string | undefined;
  baseEndpoint: string;
  baseToken: string;
}

export function WhatsAppInstancesList({
  companyId,
  baseEndpoint,
  baseToken,
}: WhatsAppInstancesListProps) {
  const {
    instances,
    isLoading,
    createInstance,
    isCreating,
    updateInstance,
    isUpdating,
    deleteInstance,
    testConnection,
    isTesting,
    fetchInstanceUsers,
    assignUser,
    removeUser,
  } = useWhatsAppInstances(companyId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<WhatsAppInstance | null>(null);
  const [managingUsersInstance, setManagingUsersInstance] = useState<WhatsAppInstance | null>(null);

  const handleCreateClick = () => {
    setEditingInstance(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (instance: WhatsAppInstance) => {
    setEditingInstance(instance);
    setIsModalOpen(true);
  };

  const handleManageUsersClick = (instance: WhatsAppInstance) => {
    setManagingUsersInstance(instance);
    setIsUsersModalOpen(true);
  };

  const handleSave = (data: { instance_name: string }) => {
    createInstance(data, {
      onSuccess: () => setIsModalOpen(false),
    });
  };

  const handleUpdate = (data: { id: string; instance_name: string }) => {
    updateInstance({ id: data.id, instance_name: data.instance_name }, {
      onSuccess: () => setIsModalOpen(false),
    });
  };

  const hasBaseConfig = baseEndpoint && baseToken;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Instâncias Conectadas</CardTitle>
                <CardDescription>
                  Gerencie múltiplas sessões do WhatsApp
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleCreateClick}
              disabled={!hasBaseConfig}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Instância
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!hasBaseConfig ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-google-yellow-50 dark:bg-google-yellow-600/10 border border-google-yellow-200 dark:border-google-yellow-600/30">
              <AlertCircle className="h-5 w-5 text-google-yellow-600 dark:text-google-yellow-400 shrink-0" />
              <p className="text-sm text-google-yellow-700 dark:text-google-yellow-400">
                Configure o URL Base e Token acima antes de criar instâncias.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : instances.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Phone className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Nenhuma instância configurada
              </p>
              <Button variant="outline" onClick={handleCreateClick}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Instância
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {instances.map(instance => (
                <WhatsAppInstanceCard
                  key={instance.id}
                  instance={instance}
                  baseEndpoint={baseEndpoint}
                  baseToken={baseToken}
                  onEdit={handleEditClick}
                  onManageUsers={handleManageUsersClick}
                  onTestConnection={testConnection}
                  onDelete={deleteInstance}
                  isTesting={isTesting}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <WhatsAppInstanceModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        instance={editingInstance}
        onSave={handleSave}
        onUpdate={handleUpdate}
        isSaving={isCreating || isUpdating}
      />

      <WhatsAppInstanceUsersModal
        open={isUsersModalOpen}
        onOpenChange={setIsUsersModalOpen}
        instance={managingUsersInstance}
        fetchInstanceUsers={fetchInstanceUsers}
        onAssignUser={assignUser}
        onRemoveUser={removeUser}
      />
    </>
  );
}
