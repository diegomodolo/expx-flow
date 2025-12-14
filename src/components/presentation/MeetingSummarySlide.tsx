import { Button } from "@/components/ui/button";
import { Check, X, Send, Users, Calendar, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Participant {
  name: string;
  role: string;
  email: string;
}

interface CreativeApproval {
  creativeId: string;
  headline: string | null;
  creativeType: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
}

interface MeetingSummarySlideProps {
  clientName: string;
  presentationName: string;
  meetingDate: Date;
  participants: Participant[];
  approvals: CreativeApproval[];
  onFinalizeMeeting: () => void;
  isLoading?: boolean;
  isCompleted?: boolean;
  primaryColor: string;
}

const CREATIVE_TYPE_LABELS: Record<string, string> = {
  post_unico: "Post Único",
  carrossel: "Carrossel",
  reels: "Reels",
  stories: "Stories",
};

export function MeetingSummarySlide({
  clientName,
  presentationName,
  meetingDate,
  participants,
  approvals,
  onFinalizeMeeting,
  isLoading,
  isCompleted,
  primaryColor,
}: MeetingSummarySlideProps) {
  const approved = approvals.filter((a) => a.status === "approved").length;
  const rejected = approvals.filter((a) => a.status === "rejected").length;
  const pending = approvals.filter((a) => a.status === "pending").length;
  const total = approvals.length;

  const approvalPercentage = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <div className="w-full h-full bg-background flex overflow-hidden">
      {/* Left side - Summary Stats */}
      <div 
        className="w-2/5 h-full p-8 flex flex-col justify-center text-white"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
      >
        <h1 className="text-3xl font-bold mb-2">Resumo da Reunião</h1>
        <p className="text-lg opacity-90 mb-8">{presentationName}</p>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 opacity-75" />
            <span>{meetingDate.toLocaleDateString("pt-BR", { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 opacity-75" />
            <span>{participants.length} participante{participants.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 opacity-75" />
            <span>{total} criativo{total !== 1 ? 's' : ''} avaliado{total !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 pt-8 border-t border-white/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-300">{approved}</div>
              <div className="text-sm opacity-75">Aprovados</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold text-red-300">{rejected}</div>
              <div className="text-sm opacity-75">Reprovados</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold text-yellow-300">{pending}</div>
              <div className="text-sm opacity-75">Pendentes</div>
            </div>
          </div>
          
          <div className="mt-4 text-center text-lg">
            Taxa de aprovação: <strong>{approvalPercentage}%</strong>
          </div>
        </div>
      </div>

      {/* Right side - Details */}
      <div className="w-3/5 h-full p-8 overflow-auto">
        {/* Participants */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Participantes
          </h3>
          <div className="flex flex-wrap gap-2">
            {participants.map((p, i) => (
              <div
                key={i}
                className="bg-muted px-3 py-2 rounded-lg text-sm"
              >
                <span className="font-medium">{p.name}</span>
                {p.role && <span className="text-muted-foreground"> • {p.role}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Creatives status */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Status dos Criativos
          </h3>
          <div className="space-y-3">
            {approvals.map((approval, i) => (
              <div
                key={approval.creativeId}
                className={cn(
                  "p-4 rounded-lg border",
                  approval.status === "approved" && "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
                  approval.status === "rejected" && "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
                  approval.status === "pending" && "bg-muted border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-background rounded-full text-muted-foreground">
                        {CREATIVE_TYPE_LABELS[approval.creativeType] || approval.creativeType}
                      </span>
                      <span className="font-medium text-foreground">
                        {approval.headline || `Criativo ${i + 1}`}
                      </span>
                    </div>
                    {approval.status === "rejected" && approval.rejectionReason && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        Motivo: {approval.rejectionReason}
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-sm font-medium",
                      approval.status === "approved" && "text-green-600 dark:text-green-400",
                      approval.status === "rejected" && "text-red-600 dark:text-red-400",
                      approval.status === "pending" && "text-muted-foreground"
                    )}
                  >
                    {approval.status === "approved" && <><Check className="w-4 h-4" /> Aprovado</>}
                    {approval.status === "rejected" && <><X className="w-4 h-4" /> Reprovado</>}
                    {approval.status === "pending" && "Pendente"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Finalize button */}
        {!isCompleted ? (
          <Button
            onClick={onFinalizeMeeting}
            disabled={isLoading || pending > 0}
            size="lg"
            className="w-full text-lg py-6"
            style={{ backgroundColor: primaryColor }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Finalizar Reunião e Enviar Resumo
              </>
            )}
          </Button>
        ) : (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <p className="font-medium text-green-700 dark:text-green-300">
              Reunião finalizada!
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              O resumo foi enviado para todos os participantes.
            </p>
          </div>
        )}

        {pending > 0 && !isCompleted && (
          <p className="text-sm text-muted-foreground text-center mt-3">
            Avalie todos os criativos antes de finalizar a reunião
          </p>
        )}
      </div>
    </div>
  );
}
