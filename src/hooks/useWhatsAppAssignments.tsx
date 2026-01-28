import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

export type AssignmentType = "individual" | "squad";
export type AssignmentStatus = "active" | "transferred" | "closed";
export type AssignmentAction = "assigned" | "transferred" | "closed" | "reopened";

export interface WhatsAppAssignment {
  id: string;
  conversation_id: string;
  company_id: string;
  assigned_type: AssignmentType;
  assigned_to_user_id: string | null;
  assigned_to_team_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
  status: AssignmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  assigned_user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  assigned_team?: {
    id: string;
    name: string;
    color: string | null;
    whatsapp_responsible_id: string | null;
  } | null;
}

export interface AssignmentHistory {
  id: string;
  conversation_id: string;
  company_id: string;
  from_user_id: string | null;
  from_team_id: string | null;
  to_user_id: string | null;
  to_team_id: string | null;
  action: AssignmentAction;
  reason: string | null;
  created_at: string;
  created_by: string | null;
}

interface AssignToUserParams {
  conversationId: string;
  companyId: string;
  userId: string;
  reason?: string;
}

interface AssignToTeamParams {
  conversationId: string;
  companyId: string;
  teamId: string;
  reason?: string;
}

interface TransferParams {
  conversationId: string;
  companyId: string;
  toUserId?: string;
  toTeamId?: string;
  reason?: string;
}

interface CloseAssignmentParams {
  conversationId: string;
  companyId: string;
  reason?: string;
}

export function useWhatsAppAssignments(companyId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all active assignments for the company
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["whatsapp-assignments", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Fetch assignments
      const { data: assignmentsData, error } = await supabase
        .from("whatsapp_conversation_assignments")
        .select("*")
        .eq("company_id", companyId)
        .eq("status", "active");

      if (error) throw error;
      if (!assignmentsData || assignmentsData.length === 0) return [];

      // Collect unique user and team IDs
      const userIds = assignmentsData
        .filter(a => a.assigned_to_user_id)
        .map(a => a.assigned_to_user_id as string);
      const teamIds = assignmentsData
        .filter(a => a.assigned_to_team_id)
        .map(a => a.assigned_to_team_id as string);

      // Fetch users and teams in parallel
      const [usersResult, teamsResult] = await Promise.all([
        userIds.length > 0
          ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
          : Promise.resolve({ data: [] }),
        teamIds.length > 0
          ? supabase.from("teams").select("id, name, color, whatsapp_responsible_id").in("id", teamIds)
          : Promise.resolve({ data: [] }),
      ]);

      const usersMap = new Map((usersResult.data || []).map(u => [u.id, u]));
      const teamsMap = new Map((teamsResult.data || []).map(t => [t.id, t]));

      return assignmentsData.map((a) => ({
        ...a,
        assigned_user: a.assigned_to_user_id ? usersMap.get(a.assigned_to_user_id) || null : null,
        assigned_team: a.assigned_to_team_id ? teamsMap.get(a.assigned_to_team_id) || null : null,
      })) as WhatsAppAssignment[];
    },
    enabled: !!companyId,
  });

  // Get assignment for a specific conversation
  const getAssignmentForConversation = useCallback((conversationId: string): WhatsAppAssignment | null => {
    return assignments?.find(a => a.conversation_id === conversationId) || null;
  }, [assignments]);

  // Assign conversation to user
  const assignToUser = useMutation({
    mutationFn: async ({ conversationId, companyId, userId, reason }: AssignToUserParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Check if already has assignment
      const existingAssignment = getAssignmentForConversation(conversationId);

      if (existingAssignment) {
        // Transfer from existing assignment
        await supabase.from("whatsapp_assignment_history").insert({
          conversation_id: conversationId,
          company_id: companyId,
          from_user_id: existingAssignment.assigned_to_user_id,
          from_team_id: existingAssignment.assigned_to_team_id,
          to_user_id: userId,
          to_team_id: null,
          action: "transferred",
          reason,
          created_by: user.id,
        });

        const { error } = await supabase
          .from("whatsapp_conversation_assignments")
          .update({
            assigned_type: "individual",
            assigned_to_user_id: userId,
            assigned_to_team_id: null,
            assigned_by: user.id,
            assigned_at: new Date().toISOString(),
            status: "active",
          })
          .eq("id", existingAssignment.id);

        if (error) throw error;
      } else {
        // Create new assignment
        await supabase.from("whatsapp_assignment_history").insert({
          conversation_id: conversationId,
          company_id: companyId,
          from_user_id: null,
          from_team_id: null,
          to_user_id: userId,
          to_team_id: null,
          action: "assigned",
          reason,
          created_by: user.id,
        });

        const { error } = await supabase
          .from("whatsapp_conversation_assignments")
          .insert({
            conversation_id: conversationId,
            company_id: companyId,
            assigned_type: "individual",
            assigned_to_user_id: userId,
            assigned_to_team_id: null,
            assigned_by: user.id,
            status: "active",
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-assignments", companyId] });
      toast({
        title: "Conversa atribuída",
        description: "A conversa foi atribuída com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atribuir conversa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Assign conversation to team (squad)
  const assignToTeam = useMutation({
    mutationFn: async ({ conversationId, companyId, teamId, reason }: AssignToTeamParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const existingAssignment = getAssignmentForConversation(conversationId);

      if (existingAssignment) {
        await supabase.from("whatsapp_assignment_history").insert({
          conversation_id: conversationId,
          company_id: companyId,
          from_user_id: existingAssignment.assigned_to_user_id,
          from_team_id: existingAssignment.assigned_to_team_id,
          to_user_id: null,
          to_team_id: teamId,
          action: "transferred",
          reason,
          created_by: user.id,
        });

        const { error } = await supabase
          .from("whatsapp_conversation_assignments")
          .update({
            assigned_type: "squad",
            assigned_to_user_id: null,
            assigned_to_team_id: teamId,
            assigned_by: user.id,
            assigned_at: new Date().toISOString(),
            status: "active",
          })
          .eq("id", existingAssignment.id);

        if (error) throw error;
      } else {
        await supabase.from("whatsapp_assignment_history").insert({
          conversation_id: conversationId,
          company_id: companyId,
          from_user_id: null,
          from_team_id: null,
          to_user_id: null,
          to_team_id: teamId,
          action: "assigned",
          reason,
          created_by: user.id,
        });

        const { error } = await supabase
          .from("whatsapp_conversation_assignments")
          .insert({
            conversation_id: conversationId,
            company_id: companyId,
            assigned_type: "squad",
            assigned_to_user_id: null,
            assigned_to_team_id: teamId,
            assigned_by: user.id,
            status: "active",
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-assignments", companyId] });
      toast({
        title: "Conversa atribuída ao squad",
        description: "A conversa foi atribuída ao squad com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atribuir conversa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Transfer conversation
  const transfer = useMutation({
    mutationFn: async ({ conversationId, companyId, toUserId, toTeamId, reason }: TransferParams) => {
      if (!toUserId && !toTeamId) {
        throw new Error("Informe um usuário ou squad de destino");
      }

      if (toUserId) {
        await assignToUser.mutateAsync({ conversationId, companyId, userId: toUserId, reason });
      } else if (toTeamId) {
        await assignToTeam.mutateAsync({ conversationId, companyId, teamId: toTeamId, reason });
      }
    },
  });

  // Close/end assignment
  const closeAssignment = useMutation({
    mutationFn: async ({ conversationId, companyId, reason }: CloseAssignmentParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const existingAssignment = getAssignmentForConversation(conversationId);
      if (!existingAssignment) {
        throw new Error("Conversa não possui atribuição ativa");
      }

      await supabase.from("whatsapp_assignment_history").insert({
        conversation_id: conversationId,
        company_id: companyId,
        from_user_id: existingAssignment.assigned_to_user_id,
        from_team_id: existingAssignment.assigned_to_team_id,
        to_user_id: null,
        to_team_id: null,
        action: "closed",
        reason,
        created_by: user.id,
      });

      const { error } = await supabase
        .from("whatsapp_conversation_assignments")
        .update({ status: "closed" })
        .eq("id", existingAssignment.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-assignments", companyId] });
      toast({
        title: "Atendimento encerrado",
        description: "O atendimento foi encerrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao encerrar atendimento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Assign to self (current user)
  const assignToSelf = useCallback(async (conversationId: string) => {
    if (!companyId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    await assignToUser.mutateAsync({
      conversationId,
      companyId,
      userId: user.id,
    });
  }, [companyId, assignToUser, toast]);

  return {
    assignments: assignments || [],
    isLoadingAssignments,
    getAssignmentForConversation,
    assignToUser: assignToUser.mutate,
    assignToTeam: assignToTeam.mutate,
    transfer: transfer.mutate,
    closeAssignment: closeAssignment.mutate,
    assignToSelf,
    isAssigning: assignToUser.isPending || assignToTeam.isPending,
    isTransferring: transfer.isPending,
    isClosing: closeAssignment.isPending,
  };
}

// Hook to get assignment for a specific conversation
export function useConversationAssignment(conversationId: string | null, companyId: string | undefined) {
  const { data: assignment, isLoading } = useQuery({
    queryKey: ["whatsapp-assignment", conversationId],
    queryFn: async () => {
      if (!conversationId || !companyId) return null;

      const { data, error } = await supabase
        .from("whatsapp_conversation_assignments")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch user or team info
      let assignedUser = null;
      let assignedTeam = null;

      if (data.assigned_to_user_id) {
        const { data: userData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", data.assigned_to_user_id)
          .single();
        assignedUser = userData;
      }

      if (data.assigned_to_team_id) {
        const { data: teamData } = await supabase
          .from("teams")
          .select("id, name, color, whatsapp_responsible_id")
          .eq("id", data.assigned_to_team_id)
          .single();
        assignedTeam = teamData;
      }

      return {
        ...data,
        assigned_user: assignedUser,
        assigned_team: assignedTeam,
      } as WhatsAppAssignment;
    },
    enabled: !!conversationId && !!companyId,
  });

  return { assignment, isLoading };
}
