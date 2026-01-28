import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Crown,
  MessageSquare,
  Loader2,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Team } from "@/hooks/useTeams";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Employee {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  team_id: string | null;
  status: string;
}

interface SquadMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squad: Team;
  onUpdate?: () => void;
}

export function SquadMembersDialog({
  open,
  onOpenChange,
  squad,
  onUpdate,
}: SquadMembersDialogProps) {
  const { activeCompany } = useCompany();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [whatsappResponsibleId, setWhatsappResponsibleId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all employees in the company
  const { data: allEmployees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees", activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      const { data, error } = await supabase
        .from("employees")
        .select("id, user_id, name, email, role, avatar, team_id, status")
        .eq("company_id", activeCompany.company_id)
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return (data || []) as Employee[];
    },
    enabled: !!activeCompany?.company_id && open,
  });

  // Fetch current squad data including leader and whatsapp responsible
  const { data: squadData, isLoading: isLoadingSquad } = useQuery({
    queryKey: ["squad-details", squad.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("leader_id, whatsapp_responsible_id")
        .eq("id", squad.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!squad.id && open,
  });

  // Initialize state when dialog opens
  useEffect(() => {
    if (open && allEmployees.length > 0) {
      // Members are employees with team_id = squad.id
      const currentMembers = allEmployees
        .filter((emp) => emp.team_id === squad.id)
        .map((emp) => emp.id);
      setSelectedMembers(currentMembers);
    }
  }, [open, allEmployees, squad.id]);

  useEffect(() => {
    if (squadData) {
      setLeaderId(squadData.leader_id || null);
      setWhatsappResponsibleId(squadData.whatsapp_responsible_id || null);
    }
  }, [squadData]);

  const toggleMember = (employeeId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSave = async () => {
    if (!activeCompany?.company_id) return;

    setIsSaving(true);
    try {
      // 1. Update employees team_id - remove from squad
      const currentMembers = allEmployees
        .filter((emp) => emp.team_id === squad.id)
        .map((emp) => emp.id);

      const toRemove = currentMembers.filter((id) => !selectedMembers.includes(id));
      const toAdd = selectedMembers.filter((id) => !currentMembers.includes(id));

      // Remove members
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from("employees")
          .update({ team_id: null })
          .in("id", toRemove);

        if (removeError) throw removeError;
      }

      // Add members
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from("employees")
          .update({ team_id: squad.id })
          .in("id", toAdd);

        if (addError) throw addError;
      }

      // 2. Update squad leader and whatsapp responsible
      const { error: squadError } = await supabase
        .from("teams")
        .update({
          leader_id: leaderId,
          whatsapp_responsible_id: whatsappResponsibleId,
        })
        .eq("id", squad.id);

      if (squadError) throw squadError;

      toast.success("Squad atualizado com sucesso!");
      onUpdate?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving squad members:", error);
      toast.error(error.message || "Erro ao salvar membros do squad");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedEmployees = allEmployees.filter((emp) =>
    selectedMembers.includes(emp.id)
  );

  const isLoading = isLoadingEmployees || isLoadingSquad;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros do Squad: {squad.name}
          </DialogTitle>
          <DialogDescription>
            Gerencie os membros, líder e responsável pelo WhatsApp deste squad.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-6 py-4">
            {/* Leader and WhatsApp Responsible */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Leader */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  Líder do Squad
                </Label>
                <Select
                  value={leaderId || "none"}
                  onValueChange={(v) => setLeaderId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o líder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {selectedEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={emp.avatar || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {emp.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {emp.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Gestor responsável pela squad
                </p>
              </div>

              {/* WhatsApp Responsible */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  Responsável WhatsApp
                </Label>
                <Select
                  value={whatsappResponsibleId || "none"}
                  onValueChange={(v) =>
                    setWhatsappResponsibleId(v === "none" ? null : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {selectedEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={emp.avatar || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {emp.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {emp.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  CS responsável pelo atendimento via WhatsApp
                </p>
              </div>
            </div>

            <Separator />

            {/* Members selection */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <Label className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Membros ({selectedMembers.length} selecionados)
                </Label>
              </div>

              <ScrollArea className="flex-1 border rounded-md p-2">
                <div className="space-y-1">
                  {allEmployees.map((employee) => {
                    const isSelected = selectedMembers.includes(employee.id);
                    const isInAnotherSquad =
                      employee.team_id && employee.team_id !== squad.id;

                    return (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => toggleMember(employee.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-md text-left transition-colors",
                          isSelected
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted border border-transparent",
                          isInAnotherSquad && !isSelected && "opacity-60"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          className="pointer-events-none"
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={employee.avatar || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {employee.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {employee.name}
                            </span>
                            {employee.id === leaderId && (
                              <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                            )}
                            {employee.id === whatsappResponsibleId && (
                              <MessageSquare className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate block">
                            {employee.role}
                            {isInAnotherSquad && !isSelected && " • Em outro squad"}
                          </span>
                        </div>
                        {isSelected ? (
                          <UserMinus className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    );
                  })}

                  {allEmployees.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum colaborador encontrado</p>
                      <p className="text-xs">
                        Adicione colaboradores em Configurações → Colaboradores
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
