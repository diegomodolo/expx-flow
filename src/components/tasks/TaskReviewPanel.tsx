import React, { useState } from "react";
import { CheckCircle2, XCircle, Shield, Clock, Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTaskReview, REJECTION_REASONS, type RejectionReason } from "@/hooks/useTaskReview";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskReviewPanelProps {
  task: any;
  onTaskUpdated?: () => void;
}

export function TaskReviewPanel({ task, onTaskUpdated }: TaskReviewPanelProps) {
  const { isAuthorizer, reviewHistory, processReview, isProcessing } = useTaskReview(task?.id);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [selectedReason, setSelectedReason] = useState<RejectionReason | null>(null);
  const [comment, setComment] = useState("");

  const isInReview = task?.status === "review";
  const qualityScore = task?.task_quality_score ?? 100;

  const handleApprove = () => {
    processReview({ action: "approved" });
    onTaskUpdated?.();
  };

  const handleReject = () => {
    if (!selectedReason) return;
    processReview({ action: "rejected", rejectionReason: selectedReason, comment: comment || undefined });
    setShowRejectForm(false);
    setSelectedReason(null);
    setComment("");
    onTaskUpdated?.();
  };

  const qualityColor =
    qualityScore >= 80 ? "text-emerald-600 dark:text-emerald-400" :
    qualityScore >= 60 ? "text-yellow-600 dark:text-yellow-400" :
    "text-red-600 dark:text-red-400";

  const qualityBg =
    qualityScore >= 80 ? "bg-emerald-500" :
    qualityScore >= 60 ? "bg-yellow-500" :
    "bg-red-500";

  return (
    <div className="space-y-4">
      {/* Quality Score */}
      {task?.id && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-semibold">Qualidade da Tarefa</span>
            </div>
            <span className={cn("text-xl font-black tabular-nums", qualityColor)}>
              {qualityScore.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-border overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", qualityBg)}
              style={{ width: `${qualityScore}%` }}
            />
          </div>
          {reviewHistory.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {reviewHistory.filter(r => r.action === "rejected").length} rejeição(ões) registrada(s)
            </p>
          )}
        </div>
      )}

      {/* Authorizer Action Block */}
      {isAuthorizer && isInReview && !showRejectForm && (
        <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
              Esta tarefa está aguardando sua aprovação
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Aprovar
            </Button>
            <Button
              onClick={() => setShowRejectForm(true)}
              disabled={isProcessing}
              variant="destructive"
              className="flex-1"
              size="sm"
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Rejeitar
            </Button>
          </div>
        </div>
      )}

      {/* Reject Form */}
      {isAuthorizer && isInReview && showRejectForm && (
        <div className="rounded-lg border-2 border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-destructive" />
            <p className="text-sm font-bold text-destructive">Motivo da Rejeição</p>
          </div>
          <div className="space-y-2">
            {(Object.entries(REJECTION_REASONS) as [RejectionReason, typeof REJECTION_REASONS[RejectionReason]][]).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setSelectedReason(key)}
                className={cn(
                  "w-full text-left rounded-md border px-3 py-2.5 text-sm transition-colors",
                  selectedReason === key
                    ? "border-destructive bg-destructive/10 font-medium"
                    : "border-border hover:bg-muted"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{info.label}</span>
                  <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                    -{info.reduction}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
              </button>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Comentário (opcional)</span>
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Descreva o que precisa ser corrigido..."
              rows={2}
              className="text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => { setShowRejectForm(false); setSelectedReason(null); setComment(""); }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={handleReject}
              disabled={!selectedReason || isProcessing}
            >
              Confirmar Rejeição
            </Button>
          </div>
        </div>
      )}

      {/* Review History */}
      {reviewHistory.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Histórico de Revisão
            </span>
          </div>
          <div className="space-y-2">
            {reviewHistory.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-md border p-3 text-sm",
                  item.action === "approved"
                    ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {item.action === "approved" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    )}
                    <span className="font-semibold text-xs">
                      {item.action === "approved" ? "Aprovada" : "Rejeitada"}
                    </span>
                    {item.rejection_reason && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1 border-red-300 text-red-600 dark:text-red-400">
                        {REJECTION_REASONS[item.rejection_reason]?.label}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Por: <span className="font-medium">{item.reviewer_name}</span></span>
                  {item.action === "rejected" && (
                    <span className="text-red-500 dark:text-red-400">
                      {item.quality_before.toFixed(0)}% → {item.quality_after.toFixed(0)}%
                    </span>
                  )}
                </div>
                {item.comment && (
                  <p className="text-xs mt-1.5 text-foreground/80 bg-background/60 rounded px-2 py-1">
                    "{item.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
