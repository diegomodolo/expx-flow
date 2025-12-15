import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompany } from "@/contexts/CompanyContext";
import { useWhatsAppNotifications } from "@/hooks/useWhatsAppNotifications";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { NotificationsDashboard } from "@/components/whatsapp/notifications/NotificationsDashboard";
import { TriggersList } from "@/components/whatsapp/notifications/TriggersList";
import { ClientContactsManager } from "@/components/whatsapp/notifications/ClientContactsManager";
import { NotificationHistory } from "@/components/whatsapp/notifications/NotificationHistory";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Bell } from "lucide-react";

export default function NotificacoesWhatsApp() {
  const { activeCompany, loading: isLoadingCompany } = useCompany();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const {
    triggers,
    contacts,
    executionLogs,
    stats,
    isLoading,
    createTrigger,
    isCreatingTrigger,
    updateTrigger,
    isUpdatingTrigger,
    deleteTrigger,
    toggleTrigger,
    createContact,
    isCreatingContact,
    updateContact,
    deleteContact,
  } = useWhatsAppNotifications(activeCompany?.company_id);

  if (isLoadingCompany || isLoading) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Notificações WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              Configure gatilhos, mensagens e gerencie contatos para alertas via WhatsApp
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="triggers">Gatilhos</TabsTrigger>
            <TabsTrigger value="contacts">Contatos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <NotificationsDashboard 
              stats={stats} 
              triggers={triggers}
              executionLogs={executionLogs}
            />
          </TabsContent>

          <TabsContent value="triggers" className="space-y-6">
            <TriggersList
              triggers={triggers}
              onCreateTrigger={createTrigger}
              isCreating={isCreatingTrigger}
              onUpdateTrigger={updateTrigger}
              isUpdating={isUpdatingTrigger}
              onDeleteTrigger={deleteTrigger}
              onToggleTrigger={toggleTrigger}
            />
          </TabsContent>

          <TabsContent value="contacts" className="space-y-6">
            <ClientContactsManager
              contacts={contacts}
              onCreateContact={createContact}
              isCreating={isCreatingContact}
              onUpdateContact={updateContact}
              onDeleteContact={deleteContact}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <NotificationHistory 
              logs={executionLogs}
              triggers={triggers}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
