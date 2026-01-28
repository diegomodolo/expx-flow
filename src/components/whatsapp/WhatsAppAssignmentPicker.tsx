import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserPlus, Users, User, X, Loader2, ArrowRightLeft } from "lucide-react";
import { useWhatsAppAssignments, WhatsAppAssignment } from "@/hooks/useWhatsAppAssignments";
import { WhatsAppTransferDialog } from "./WhatsAppTransferDialog";
import { cn } from "@/lib/utils";

interface WhatsAppAssignmentPickerProps {
  conversationId: string;
  companyId: string | undefined;
  currentAssignment: WhatsAppAssignment | null;
  onAssignmentChange?: () => void;
}

export function WhatsAppAssignmentPicker({
  conversationId,
  companyId,
  currentAssignment,
  onAssignmentChange,
}: WhatsAppAssignmentPickerProps) {
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const {
    assignToSelf,
    closeAssignment,
    isAssigning,
    isClosing,
  } = useWhatsAppAssignments(companyId);

  const handleAssignToSelf = async () => {
    await assignToSelf(conversationId);
    onAssignmentChange?.();
  };

  const handleCloseAssignment = () => {
    if (!companyId) return;
    closeAssignment({
      conversationId,
      companyId,
      reason: "Encerrado manualmente",
    });
    onAssignmentChange?.();
  };

  const isLoading = isAssigning || isClosing;

  // Render current assignment status
  const renderAssignmentStatus = () => {
    if (!currentAssignment) {
      return (
        <span className="flex items-center gap-1 text-muted-foreground text-xs">
          <UserPlus className="h-3 w-3" />
          Sem atribuição
        </span>
      );
    }

    if (currentAssignment.assigned_type === "individual" && currentAssignment.assigned_user) {
      return (
        <span className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5">
            <AvatarImage src={currentAssignment.assigned_user.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {currentAssignment.assigned_user.full_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs truncate max-w-[80px]">
            {currentAssignment.assigned_user.full_name || "Atendente"}
          </span>
        </span>
      );
    }

    if (currentAssignment.assigned_type === "squad" && currentAssignment.assigned_team) {
      return (
        <span className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="h-5 px-1.5 text-[10px]"
            style={{
              borderColor: currentAssignment.assigned_team.color || undefined,
              backgroundColor: currentAssignment.assigned_team.color
                ? `${currentAssignment.assigned_team.color}15`
                : undefined,
              color: currentAssignment.assigned_team.color || undefined,
            }}
          >
            <Users className="h-3 w-3 mr-0.5" />
            {currentAssignment.assigned_team.name}
          </Badge>
        </span>
      );
    }

    return null;
  };

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 px-2",
                  currentAssignment && "bg-muted/50"
                )}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  renderAssignmentStatus()
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {currentAssignment ? "Gerenciar atribuição" : "Atribuir conversa"}
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Atribuição
          </DropdownMenuLabel>

          {/* Assign to self */}
          <DropdownMenuItem onClick={handleAssignToSelf} disabled={isLoading}>
            <User className="h-4 w-4 mr-2" />
            Atribuir a mim
          </DropdownMenuItem>

          {/* Transfer to someone else */}
          <DropdownMenuItem
            onClick={() => setIsTransferDialogOpen(true)}
            disabled={isLoading}
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transferir...
          </DropdownMenuItem>

          {/* Close assignment (only if assigned) */}
          {currentAssignment && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleCloseAssignment}
                disabled={isLoading}
                className="text-destructive focus:text-destructive"
              >
                <X className="h-4 w-4 mr-2" />
                Encerrar atendimento
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Transfer Dialog */}
      <WhatsAppTransferDialog
        open={isTransferDialogOpen}
        onOpenChange={setIsTransferDialogOpen}
        conversationId={conversationId}
        companyId={companyId}
        currentAssignment={currentAssignment}
        onTransferComplete={() => {
          setIsTransferDialogOpen(false);
          onAssignmentChange?.();
        }}
      />
    </>
  );
}
