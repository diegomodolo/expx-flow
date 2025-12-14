import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  MoreVertical,
  Eye,
  Send,
  RefreshCw,
  Image,
  Film,
  LayoutGrid,
  Square,
  Loader2,
  Edit,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExtendedPresentationCreative, usePresentationMeetings, useSendToSchedule } from "@/hooks/usePresentationMeetings";
import { CreativePreviewModal } from "./CreativePreviewModal";

interface CreativesListProps {
  creatives: ExtendedPresentationCreative[];
  isLoading: boolean;
  presentationId: string;
  clientId: string;
  onRefresh: () => void;
}

const CREATIVE_TYPE_LABELS: Record<string, string> = {
  post_unico: "Post Único",
  carrossel: "Carrossel",
  reels: "Reels",
  stories: "Stories",
};

const CREATIVE_TYPE_ICONS: Record<string, React.ElementType> = {
  post_unico: Image,
  carrossel: LayoutGrid,
  reels: Film,
  stories: Square,
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType; color: string }> = {
  pending: { label: "Pendente", variant: "secondary", icon: Clock, color: "text-muted-foreground" },
  approved: { label: "Aprovado", variant: "default", icon: CheckCircle2, color: "text-green-500" },
  rejected: { label: "Reprovado", variant: "destructive", icon: XCircle, color: "text-red-500" },
  resubmitted: { label: "Reenviado", variant: "outline", icon: RefreshCw, color: "text-yellow-500" },
  scheduled: { label: "Agendado", variant: "default", icon: Calendar, color: "text-blue-500" },
};

export function CreativesList({ creatives, isLoading, presentationId, clientId, onRefresh }: CreativesListProps) {
  const [previewCreative, setPreviewCreative] = useState<ExtendedPresentationCreative | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);
  
  const { managerApproveCreative, markAsResubmitted } = usePresentationMeetings(presentationId);
  const { sendToSchedule } = useSendToSchedule();

  const handleManagerApprove = async (creativeId: string) => {
    setApprovingId(creativeId);
    await managerApproveCreative.mutateAsync(creativeId);
    setApprovingId(null);
    onRefresh();
  };

  const handleResubmit = async (creativeId: string) => {
    setResubmittingId(creativeId);
    await markAsResubmitted.mutateAsync(creativeId);
    setResubmittingId(null);
    onRefresh();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-32 w-full mb-3" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (creatives.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <LayoutGrid className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum criativo</h3>
          <p className="text-muted-foreground">
            Esta apresentação ainda não possui criativos.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {creatives.map((creative) => {
          const statusConfig = STATUS_CONFIG[creative.current_status] || STATUS_CONFIG.pending;
          const StatusIcon = statusConfig.icon;
          const TypeIcon = CREATIVE_TYPE_ICONS[creative.creative_type] || Image;
          const firstMedia = creative.creative_media?.[0];

          return (
            <Card key={creative.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {/* Media Preview */}
              <div 
                className="relative h-40 bg-muted cursor-pointer"
                onClick={() => setPreviewCreative(creative)}
              >
                {firstMedia ? (
                  firstMedia.media_type === 'video' ? (
                    <video
                      src={firstMedia.media_url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={firstMedia.media_url}
                      alt={creative.headline || 'Creative'}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <TypeIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                
                {/* Media count badge */}
                {(creative.creative_media?.length || 0) > 1 && (
                  <Badge className="absolute top-2 right-2 bg-black/70">
                    +{(creative.creative_media?.length || 1) - 1}
                  </Badge>
                )}
                
                {/* Status overlay */}
                <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  creative.current_status === 'approved' ? 'bg-green-500/90 text-white' :
                  creative.current_status === 'rejected' ? 'bg-red-500/90 text-white' :
                  creative.current_status === 'scheduled' ? 'bg-blue-500/90 text-white' :
                  creative.current_status === 'resubmitted' ? 'bg-yellow-500/90 text-white' :
                  'bg-black/70 text-white'
                }`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </div>
              </div>

              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TypeIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {CREATIVE_TYPE_LABELS[creative.creative_type]}
                      </span>
                    </div>
                    <h3 className="font-medium text-foreground line-clamp-1">
                      {creative.headline || `Criativo ${creative.order_index + 1}`}
                    </h3>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPreviewCreative(creative)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                      
                      {creative.current_status === 'rejected' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleResubmit(creative.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Marcar como Corrigido
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {(creative.current_status === 'rejected' || creative.current_status === 'resubmitted') && (
                        <DropdownMenuItem 
                          onClick={() => handleManagerApprove(creative.id)}
                          className="text-green-600"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Aprovar (Gestor)
                        </DropdownMenuItem>
                      )}
                      
                      {creative.current_status === 'scheduled' && (
                        <DropdownMenuItem disabled>
                          <Calendar className="h-4 w-4 mr-2" />
                          Já agendado
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Schedule info */}
                {creative.scheduled_date && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(creative.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                      {creative.scheduled_time && ` às ${creative.scheduled_time}`}
                    </span>
                  </div>
                )}

                {/* Caption preview */}
                {creative.caption && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {creative.caption}
                  </p>
                )}

                {/* Manager approval info */}
                {creative.manager_approved_at && (
                  <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Aprovado pelo gestor
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Modal */}
      <CreativePreviewModal
        creative={previewCreative}
        onClose={() => setPreviewCreative(null)}
      />
    </>
  );
}
