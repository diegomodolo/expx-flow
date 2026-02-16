import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface BoardColumnWithOwner {
  id: string;
  user_id: string;
  name: string;
  color: string;
  order_index: number;
  owner_name: string;
}

export interface BoardGroup {
  user_id: string;
  owner_name: string;
  columns: BoardColumnWithOwner[];
}

export function useAllBoardColumns() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['all-board-columns', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Fetch all board columns for the company
      const { data: columns, error: colError } = await (supabase
        .from('task_board_columns' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('order_index', { ascending: true }) as any);

      if (colError) throw colError;

      // Fetch active employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('user_id, name')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (empError) throw empError;

      const employeeMap = new Map<string, string>();
      (employees || []).forEach((e: any) => employeeMap.set(e.user_id, e.name));

      // Group by user_id
      const grouped = new Map<string, BoardGroup>();
      (columns || []).forEach((col: any) => {
        const ownerName = employeeMap.get(col.user_id) || 'Desconhecido';
        if (!grouped.has(col.user_id)) {
          grouped.set(col.user_id, {
            user_id: col.user_id,
            owner_name: ownerName,
            columns: [],
          });
        }
        grouped.get(col.user_id)!.columns.push({
          id: col.id,
          user_id: col.user_id,
          name: col.name,
          color: col.color,
          order_index: col.order_index,
          owner_name: ownerName,
        });
      });

      return Array.from(grouped.values()).sort((a, b) =>
        a.owner_name.localeCompare(b.owner_name, 'pt-BR')
      );
    },
    enabled: !!companyId,
  });

  return { boards, isLoading };
}
