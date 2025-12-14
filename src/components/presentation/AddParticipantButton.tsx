import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";

interface Participant {
  name: string;
  role: string;
  email: string;
}

interface AddParticipantButtonProps {
  onAddParticipant: (participant: Participant) => void;
  meetingId: string | null;
  primaryColor?: string;
}

export function AddParticipantButton({
  onAddParticipant,
  meetingId,
  primaryColor = "#1a73e8",
}: AddParticipantButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) return;

    setIsLoading(true);
    try {
      // If we have a meeting ID, save to database
      if (meetingId) {
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase
          .from("presentation_meeting_participants")
          .insert({
            meeting_id: meetingId,
            name: name.trim(),
            role: role.trim(),
            email: email.trim(),
          });
      }

      onAddParticipant({ 
        name: name.trim(), 
        role: role.trim(), 
        email: email.trim() 
      });

      setName("");
      setRole("");
      setEmail("");
      setOpen(false);
    } catch (err) {
      console.error("Error adding participant:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/70 hover:text-white hover:bg-white/10"
          title="Adicionar participante"
        >
          <UserPlus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" style={{ color: primaryColor }} />
            Adicionar Participante
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label htmlFor="new-name">Nome *</Label>
            <Input
              id="new-name"
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="new-role">Cargo</Label>
            <Input
              id="new-role"
              placeholder="Ex: Diretor de Marketing"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div>
            <Label htmlFor="new-email">Email *</Label>
            <Input
              id="new-email"
              type="email"
              placeholder="email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!name.trim() || !email.trim() || isLoading}
            className="w-full"
            style={{ backgroundColor: primaryColor }}
          >
            {isLoading ? "Adicionando..." : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
