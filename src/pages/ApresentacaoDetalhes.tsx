import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Eye,
  Link2,
  Users,
  FileVideo,
  MessageSquare,
  RefreshCw,
  Image,
  Film,
  LayoutGrid,
  Square,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePresentationDetails } from "@/hooks/usePresentations";
import { usePresentationMeetings, useSendToSchedule, ExtendedPresentationCreative } from "@/hooks/usePresentationMeetings";
import { useToast } from "@/hooks/use-toast";
import { CreativesList } from "@/components/presentation-details/CreativesList";
import { MeetingsHistory } from "@/components/presentation-details/MeetingsHistory";
import { SendToScheduleModal } from "@/components/presentation-details/SendToScheduleModal";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const CREATIVE_TYPE_ICONS: Record<string, React.ElementType> = {
  post_unico: Image,
  carrossel: LayoutGrid,
  reels: Film,
  stories: Square,
};

export default function ApresentacaoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const { data: presentation, isLoading: isLoadingPresentation } = usePresentationDetails(id || '');
  const { creatives, meetings, isLoadingCreatives, isLoadingMeetings, refetch } = usePresentationMeetings(id || '');
  const { sendToSchedule } = useSendToSchedule();

  // Stats calculation
  const stats = useMemo(() => {
    const total = creatives.length;
    const approved = creatives.filter(c => c.current_status === 'approved').length;
    const rejected = creatives.filter(c => c.current_status === 'rejected').length;
    const pending = creatives.filter(c => c.current_status === 'pending').length;
    const resubmitted = creatives.filter(c => c.current_status === 'resubmitted').length;
    const scheduled = creatives.filter(c => c.current_status === 'scheduled').length;
    const readyToSchedule = creatives.filter(c => c.current_status === 'approved' && !c.scheduled_post_id).length;

    return {
      total,
      approved,
      rejected,
      pending,
      resubmitted,
      scheduled,
      readyToSchedule,
      allApproved: approved === total && total > 0,
      canScheduleAny: readyToSchedule > 0,
    };
  }, [creatives]);

  // Get latest meeting
  const latestMeeting = meetings[0];

  const handleCopyLink = () => {
    if (presentation?.public_token) {
      const url = `${window.location.origin}/apresentacao/${presentation.public_token}`;
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado!",
        description: "O link da apresentação foi copiado para a área de transferência.",
      });
    }
  };

  const handleOpenPresentation = () => {
    if (presentation?.public_token) {
      window.open(`/apresentacao/${presentation.public_token}`, '_blank');
    }
  };

  if (isLoadingPresentation) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!presentation) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Apresentação não encontrada</p>
          <Button variant="outline" onClick={() => navigate('/geradores/apresentacoes')} className="mt-4">
            Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/geradores/apresentacoes")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>

        {/* Presentation Info */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={presentation.clients?.avatar || undefined} />
              <AvatarFallback className="text-xl">
                {presentation.clients?.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{presentation.name}</h1>
              <p className="text-muted-foreground">
                {presentation.clients?.name} • {MONTH_NAMES[presentation.month - 1]} {presentation.year}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {presentation.public_token && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Copiar Link
                </Button>
                <Button variant="outline" size="sm" onClick={handleOpenPresentation}>
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar
                </Button>
              </>
            )}
            <Button
              onClick={() => setShowScheduleModal(true)}
              disabled={!stats.canScheduleAny}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Enviar para Agendamento
              {stats.readyToSchedule > 0 && (
                <Badge variant="secondary" className="ml-1">{stats.readyToSchedule}</Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <LayoutGrid className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Aprovados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
                  <p className="text-xs text-muted-foreground">Reprovados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-500">{stats.pending + stats.resubmitted}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-500">{stats.scheduled}</p>
                  <p className="text-xs text-muted-foreground">Agendados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="creatives" className="space-y-4">
          <TabsList>
            <TabsTrigger value="creatives" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Criativos ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="meetings" className="gap-2">
              <Users className="w-4 h-4" />
              Reuniões ({meetings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="creatives" className="space-y-4">
            <CreativesList
              creatives={creatives}
              isLoading={isLoadingCreatives}
              presentationId={id || ''}
              clientId={presentation.client_id}
              onRefresh={refetch}
            />
          </TabsContent>

          <TabsContent value="meetings" className="space-y-4">
            <MeetingsHistory
              meetings={meetings}
              isLoading={isLoadingMeetings}
              presentationId={id || ''}
              onRefresh={refetch}
            />
          </TabsContent>
        </Tabs>

        {/* Send to Schedule Modal */}
        <SendToScheduleModal
          open={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          creatives={creatives.filter(c => c.current_status === 'approved' && !c.scheduled_post_id)}
          clientId={presentation.client_id}
          companyId={presentation.company_id}
          onSuccess={() => {
            setShowScheduleModal(false);
            refetch();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
