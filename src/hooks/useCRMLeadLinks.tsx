import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LinkedLead {
  id: string;
  full_name: string;
  stage_id: string;
  stage_name: string;
  board_id: string;
  board_name: string;
  status: string;
  created_at: string;
}

export const useCRMLeadLinks = (leadId: string) => {
  return useQuery({
    queryKey: ['crm-lead-links', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      // Buscar links onde este lead aparece
      const { data: links, error: linksError } = await supabase
        .from('crm_lead_links')
        .select('lead_a_id, lead_b_id')
        .or(`lead_a_id.eq.${leadId},lead_b_id.eq.${leadId}`);
      
      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];
      
      // Extrair IDs dos leads vinculados
      const linkedIds = links.map(link => 
        link.lead_a_id === leadId ? link.lead_b_id : link.lead_a_id
      );
      
      // Buscar dados completos dos leads vinculados
      const { data: linkedLeads, error: leadsError } = await supabase
        .from('crm_leads')
        .select(`
          id,
          full_name,
          status,
          created_at,
          stage:crm_stages!inner(
            id,
            name,
            board:crm_boards!inner(
              id,
              name
            )
          )
        `)
        .in('id', linkedIds);
      
      if (leadsError) throw leadsError;
      
      return (linkedLeads || []).map((lead: any) => ({
        id: lead.id,
        full_name: lead.full_name,
        status: lead.status,
        created_at: lead.created_at,
        stage_id: lead.stage.id,
        stage_name: lead.stage.name,
        board_id: lead.stage.board.id,
        board_name: lead.stage.board.name,
      })) as LinkedLead[];
    },
    enabled: !!leadId,
  });
};
