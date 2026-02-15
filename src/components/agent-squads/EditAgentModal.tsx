import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AgentEditContent } from "@/components/agents/AgentEditContent";

interface EditAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  onAgentUpdated?: () => void;
}

export function EditAgentModal({ open, onOpenChange, agentId, onAgentUpdated }: EditAgentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden">
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
