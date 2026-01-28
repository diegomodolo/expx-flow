import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { User, Users, Check, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppAssignments, WhatsAppAssignment } from "@/hooks/useWhatsAppAssignments";
import { cn } from "@/lib/utils";

interface WhatsAppTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  companyId: string | undefined;
  currentAssignment: WhatsAppAssignment | null;
  onTransferComplete?: () => void;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Team {
  id: string;
  name: string;
  color: string | null;
}

export function WhatsAppTransferDialog({
  open,
  onOpenChange,
  conversationId,
  companyId,
  currentAssignment,
  onTransferComplete,
}: WhatsAppTransferDialogProps) {
  const [selectedTab, setSelectedTab] = useState<"person" | "squad">("person");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { assignToUser, assignToTeam, isAssigning } = useWhatsAppAssignments(companyId);

  // Fetch team members (profiles in the same company)
  const { data: teamMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["company-members", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("employees")
        .select("user_id")
        .eq("company_id", companyId)
        .eq("status", "active");

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = data.map((e) => e.user_id).filter(Boolean) as string[];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;
      return (profiles || []) as TeamMember[];
    },
    enabled: !!companyId && open,
  });

  // Fetch teams (squads)
  const { data: teams = [], isLoading: isLoadingTeams } = useQuery({
    queryKey: ["company-teams", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("teams")
        .select("id, name, color")
        .eq("company_id", companyId);

      if (error) throw error;
      return (data || []) as Team[];
    },
    enabled: !!companyId && open,
  });

  // Filter by search
  const filteredMembers = teamMembers.filter((member) =>
    member.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTransfer = () => {
    if (!companyId) return;

    if (selectedTab === "person" && selectedUserId) {
      assignToUser(
        {
          conversationId,
          companyId,
          userId: selectedUserId,
          reason: reason || undefined,
        },
        {
          onSuccess: () => {
            resetAndClose();
            onTransferComplete?.();
          },
        }
      );
    } else if (selectedTab === "squad" && selectedTeamId) {
      assignToTeam(
        {
          conversationId,
          companyId,
          teamId: selectedTeamId,
          reason: reason || undefined,
        },
        {
          onSuccess: () => {
            resetAndClose();
            onTransferComplete?.();
          },
        }
      );
    }
  };

  const resetAndClose = () => {
    setSelectedUserId(null);
    setSelectedTeamId(null);
    setReason("");
    setSearchQuery("");
    onOpenChange(false);
  };

  const canTransfer =
    (selectedTab === "person" && selectedUserId) ||
    (selectedTab === "squad" && selectedTeamId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir conversa</DialogTitle>
          <DialogDescription>
            Escolha para quem deseja transferir esta conversa.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={selectedTab}
          onValueChange={(v) => setSelectedTab(v as "person" | "squad")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="person" className="gap-1.5">
              <User className="h-4 w-4" />
              Para Pessoa
            </TabsTrigger>
            <TabsTrigger value="squad" className="gap-1.5">
              <Users className="h-4 w-4" />
              Para Squad
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Person tab */}
          <TabsContent value="person" className="mt-4">
            <ScrollArea className="h-[200px] rounded-md border p-2">
              {isLoadingMembers ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Nenhum membro encontrado
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredMembers.map((member) => {
                    const isCurrentlyAssigned =
                      currentAssignment?.assigned_to_user_id === member.id;
                    const isSelected = selectedUserId === member.id;

                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setSelectedUserId(member.id)}
                        disabled={isCurrentlyAssigned}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                          isSelected
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted",
                          isCurrentlyAssigned && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {member.full_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-sm truncate">
                          {member.full_name || "Sem nome"}
                          {isCurrentlyAssigned && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (atual)
                            </span>
                          )}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Squad tab */}
          <TabsContent value="squad" className="mt-4">
            <ScrollArea className="h-[200px] rounded-md border p-2">
              {isLoadingTeams ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTeams.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Nenhum squad encontrado
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTeams.map((team) => {
                    const isCurrentlyAssigned =
                      currentAssignment?.assigned_to_team_id === team.id;
                    const isSelected = selectedTeamId === team.id;

                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => setSelectedTeamId(team.id)}
                        disabled={isCurrentlyAssigned}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                          isSelected
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted",
                          isCurrentlyAssigned && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Badge
                          variant="outline"
                          className="h-8 w-8 p-0 flex items-center justify-center rounded-md"
                          style={{
                            borderColor: team.color || undefined,
                            backgroundColor: team.color
                              ? `${team.color}15`
                              : undefined,
                          }}
                        >
                          <Users
                            className="h-4 w-4"
                            style={{ color: team.color || undefined }}
                          />
                        </Badge>
                        <span className="flex-1 text-sm truncate">
                          {team.name}
                          {isCurrentlyAssigned && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (atual)
                            </span>
                          )}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Reason */}
        <div className="space-y-2 mt-2">
          <Label htmlFor="reason" className="text-sm">
            Motivo (opcional)
          </Label>
          <Textarea
            id="reason"
            placeholder="Informe o motivo da transferência..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={resetAndClose}>
            Cancelar
          </Button>
          <Button onClick={handleTransfer} disabled={!canTransfer || isAssigning}>
            {isAssigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
