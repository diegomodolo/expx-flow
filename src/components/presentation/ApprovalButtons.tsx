import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ApprovalStatus = "pending" | "approved" | "rejected";

interface ApprovalButtonsProps {
  status: ApprovalStatus;
  onApprove: () => void;
  onReject: () => void;
  isLoading?: boolean;
  rejectionReason?: string | null;
}

export function ApprovalButtons({
  status,
  onApprove,
  onReject,
  isLoading,
  rejectionReason,
}: ApprovalButtonsProps) {
  return (
    <div className="mt-6 pt-6 border-t border-border">
      <div className="flex items-center gap-3 mb-3">
        <Button
          onClick={onApprove}
          disabled={isLoading}
          variant={status === "approved" ? "default" : "outline"}
          className={cn(
            "flex-1",
            status === "approved" && "bg-green-600 hover:bg-green-700 text-white border-green-600"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          {status === "approved" ? "Aprovado" : "Aprovar"}
        </Button>
        <Button
          onClick={onReject}
          disabled={isLoading}
          variant={status === "rejected" ? "default" : "outline"}
          className={cn(
            "flex-1",
            status === "rejected" && "bg-red-600 hover:bg-red-700 text-white border-red-600"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <X className="w-4 h-4 mr-2" />
          )}
          {status === "rejected" ? "Reprovado" : "Reprovar"}
        </Button>
      </div>

      {/* Status indicator */}
      {status !== "pending" && (
        <div
          className={cn(
            "text-sm p-3 rounded-lg",
            status === "approved" && "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
            status === "rejected" && "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
          )}
        >
          {status === "approved" ? (
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Este criativo foi aprovado</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 font-medium">
                <X className="w-4 h-4" />
                <span>Este criativo foi reprovado</span>
              </div>
              {rejectionReason && (
                <p className="mt-1 ml-6 text-xs opacity-80">
                  Motivo: {rejectionReason}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
