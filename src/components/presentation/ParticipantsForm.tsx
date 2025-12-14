import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X, Users, ArrowRight } from "lucide-react";

interface Participant {
  name: string;
  role: string;
  email: string;
}

interface ParticipantsFormProps {
  participants: Participant[];
  onAddParticipant: (participant: Participant) => void;
  onRemoveParticipant: (index: number) => void;
  onStartPresentation: () => void;
  isLoading?: boolean;
  primaryColor: string;
}

export function ParticipantsForm({
  participants,
  onAddParticipant,
  onRemoveParticipant,
  onStartPresentation,
  isLoading,
  primaryColor,
}: ParticipantsFormProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");

  const handleAdd = () => {
    if (name.trim() && email.trim()) {
      onAddParticipant({ name: name.trim(), role: role.trim(), email: email.trim() });
      setName("");
      setRole("");
      setEmail("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="w-full h-full bg-background flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div 
            className="p-3 rounded-full"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <Users className="w-8 h-8" style={{ color: primaryColor }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Quem está participando desta reunião?
            </h2>
            <p className="text-muted-foreground">
              Adicione os participantes para iniciar a apresentação
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div>
              <Label htmlFor="role">Cargo</Label>
              <Input
                id="role"
                placeholder="Ex: Diretor de Marketing"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
          <Button
            onClick={handleAdd}
            disabled={!name.trim() || !email.trim()}
            className="w-full"
            style={{ backgroundColor: primaryColor }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar Participante
          </Button>
        </div>

        {/* Participants list */}
        {participants.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <h3 className="text-sm font-medium text-foreground mb-4">
              Participantes ({participants.length})
            </h3>
            <div className="space-y-3">
              {participants.map((p, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.role && `${p.role} • `}{p.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveParticipant(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start button */}
        <Button
          onClick={onStartPresentation}
          disabled={participants.length === 0 || isLoading}
          size="lg"
          className="w-full text-lg py-6"
          style={{ backgroundColor: primaryColor }}
        >
          {isLoading ? "Iniciando..." : "Iniciar Apresentação"}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
