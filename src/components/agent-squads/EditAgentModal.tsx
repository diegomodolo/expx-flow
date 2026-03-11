import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { AgentEditContent } from "@/components/agents/AgentEditContent";

interface EditAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  onAgentUpdated?: () => void;
}

export function EditAgentModal({
  open,
  onOpenChange,
  agentId,
  onAgentUpdated,
}: EditAgentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden flex flex-col">
        <VisuallyHidden>
          <DialogTitle>Editar agente</DialogTitle>
        </VisuallyHidden>
        <AgentEditContent
          agentId={agentId}
          defaultSection="geral"
          showChat={false}
          onSaved={() => {
            onAgentUpdated?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
