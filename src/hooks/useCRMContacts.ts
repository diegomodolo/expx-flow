import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CRMContact {
  id: string;
  workspace_id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  external_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  custom_fields?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface CreateContactData {
  workspace_id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  external_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  notes?: string | null;
  tags?: string[];
}

export interface UpdateContactData extends Partial<CreateContactData> {
  id: string;
}

export function useCRMContacts(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch all contacts for workspace
  const {
    data: contacts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["crm-contacts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("crm_contacts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CRMContact[];
    },
    enabled: !!workspaceId,
  });

  // Create contact
  const createContactMutation = useMutation({
    mutationFn: async (contactData: CreateContactData) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("crm_contacts")
        .insert({
          ...contactData,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CRMContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts", workspaceId] });
      toast.success("Contato criado com sucesso");
    },
    onError: (error) => {
      console.error("Error creating contact:", error);
      toast.error("Erro ao criar contato");
    },
  });

  // Update contact
  const updateContactMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateContactData) => {
      const { data, error } = await supabase
        .from("crm_contacts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CRMContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts", workspaceId] });
      toast.success("Contato atualizado com sucesso");
    },
    onError: (error) => {
      console.error("Error updating contact:", error);
      toast.error("Erro ao atualizar contato");
    },
  });

  // Delete contact
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("crm_contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts", workspaceId] });
      toast.success("Contato removido com sucesso");
    },
    onError: (error) => {
      console.error("Error deleting contact:", error);
      toast.error("Erro ao remover contato");
    },
  });

  // Find or create contact
  const findOrCreateContact = async (
    contactData: CreateContactData
  ): Promise<CRMContact> => {
    // First, try to find by external_id if provided
    if (contactData.external_id) {
      const { data: existingContact } = await supabase
        .from("crm_contacts")
        .select("*")
        .eq("workspace_id", contactData.workspace_id)
        .eq("external_id", contactData.external_id)
        .single();

      if (existingContact) {
        return existingContact as CRMContact;
      }
    }

    // Try to find by email if provided
    if (contactData.email) {
      const { data: existingContact } = await supabase
        .from("crm_contacts")
        .select("*")
        .eq("workspace_id", contactData.workspace_id)
        .eq("email", contactData.email)
        .single();

      if (existingContact) {
        return existingContact as CRMContact;
      }
    }

    // Try to find by phone if provided
    if (contactData.phone) {
      const { data: existingContact } = await supabase
        .from("crm_contacts")
        .select("*")
        .eq("workspace_id", contactData.workspace_id)
        .eq("phone", contactData.phone)
        .single();

      if (existingContact) {
        return existingContact as CRMContact;
      }
    }

    // Create new contact
    const newContact = await createContactMutation.mutateAsync(contactData);
    return newContact;
  };

  return {
    contacts,
    isLoading,
    error,
    refetch,
    createContact: createContactMutation.mutateAsync,
    updateContact: updateContactMutation.mutateAsync,
    deleteContact: deleteContactMutation.mutateAsync,
    findOrCreateContact,
    isCreating: createContactMutation.isPending,
    isUpdating: updateContactMutation.isPending,
    isDeleting: deleteContactMutation.isPending,
  };
}
