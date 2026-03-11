import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface WorkSchedule {
  id: string;
  company_id: string;
  name: string;
  work_start: string;
  lunch_start: string;
  lunch_end: string;
  work_end: string;
  created_at: string;
  updated_at: string;
}

export function useWorkSchedules() {
  const { activeCompany } = useCompany();
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSchedules = useCallback(async () => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("work_schedules")
        .select("*")
        .eq("company_id", activeCompany.company_id)
        .order("name");
      if (error) throw error;
      setSchedules((data || []) as WorkSchedule[]);
    } catch (err) {
      console.error("Error fetching work schedules:", err);
    } finally {
      setLoading(false);
    }
  }, [activeCompany]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const createSchedule = async (data: Omit<WorkSchedule, "id" | "company_id" | "created_at" | "updated_at">) => {
    if (!activeCompany) throw new Error("No company");
    const { error } = await supabase
      .from("work_schedules")
      .insert({ ...data, company_id: activeCompany.company_id });
    if (error) throw error;
    await fetchSchedules();
  };

  const updateSchedule = async (id: string, data: Partial<WorkSchedule>) => {
    const { error } = await supabase
      .from("work_schedules")
      .update(data)
      .eq("id", id);
    if (error) throw error;
    await fetchSchedules();
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase
      .from("work_schedules")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await fetchSchedules();
  };

  const assignScheduleToEmployee = async (employeeId: string, scheduleId: string | null) => {
    const { error } = await supabase
      .from("employees")
      .update({ work_schedule_id: scheduleId } as unknown)
      .eq("id", employeeId);
    if (error) throw error;
  };

  return { schedules, loading, createSchedule, updateSchedule, deleteSchedule, assignScheduleToEmployee, fetchSchedules };
}
