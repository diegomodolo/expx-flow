import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Trophy, Phone, Calendar, FileCheck, Star, Plus, X } from "lucide-react";
import { useCSHealthScore360 } from "@/hooks/useCSHealthScore360";
import { CSHealthScore360Card } from "@/components/cs/CSHealthScore360Card";
import { CSSuccessJourney } from "@/components/cs/CSSuccessJourney";
import { CSTouchpointLog } from "@/components/cs/CSTouchpointLog";
import { CSQBRList } from "@/components/cs/CSQBRList";
import { CSNPSTracker } from "@/components/cs/CSNPSTracker";
import { CSValueStatementList } from "@/components/cs/CSValueStatementList";
import { CSNewTouchpointModal } from "@/components/cs/CSNewTouchpointModal";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface CSClientDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName?: string;
}

export function CSClientDetailModal({ 
  open, 
  onOpenChange, 
  clientId,
  clientName 
}: CSClientDetailModalProps) {
  const { healthData, isLoading } = useCSHealthScore360();
  const [showNewTouchpoint, setShowNewTouchpoint] = useState(false);

  const clientHealth = healthData.find(c => c.clientId === clientId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Heart className="h-5 w-5 text-primary" />
              {clientName || clientHealth?.clientName || 'Customer Success'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Quick Actions */}
            <div className="flex items-center justify-end">
              <Button size="sm" onClick={() => setShowNewTouchpoint(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Registrar Contato
              </Button>
            </div>

            {/* Health Score Card */}
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : clientHealth ? (
              <CSHealthScore360Card data={clientHealth} />
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-8">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Health Score não configurado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure as metas deste cliente para calcular o Health Score 360
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="journey" className="space-y-4">
              <TabsList className="grid w-full max-w-2xl grid-cols-5">
                <TabsTrigger value="journey" className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  <span className="hidden sm:inline">Jornada</span>
                </TabsTrigger>
                <TabsTrigger value="touchpoints" className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  <span className="hidden sm:inline">Contatos</span>
                </TabsTrigger>
                <TabsTrigger value="nps" className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  <span className="hidden sm:inline">NPS</span>
                </TabsTrigger>
                <TabsTrigger value="qbr" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">QBR</span>
                </TabsTrigger>
                <TabsTrigger value="value" className="flex items-center gap-1">
                  <FileCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Valor</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="journey">
                <CSSuccessJourney clientId={clientId} />
              </TabsContent>

              <TabsContent value="touchpoints">
                <CSTouchpointLog clientId={clientId} />
              </TabsContent>

              <TabsContent value="nps">
                <CSNPSTracker clientId={clientId} />
              </TabsContent>

              <TabsContent value="qbr">
                <CSQBRList clientId={clientId} />
              </TabsContent>

              <TabsContent value="value">
                <CSValueStatementList clientId={clientId} />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Touchpoint Modal */}
      <CSNewTouchpointModal
        open={showNewTouchpoint}
        onOpenChange={setShowNewTouchpoint}
        clientId={clientId}
        clientName={clientName || clientHealth?.clientName}
      />
    </>
  );
}
