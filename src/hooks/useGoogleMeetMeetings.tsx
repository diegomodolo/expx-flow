import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface GoogleMeetMeeting {
  id: string;
  company_id: string;
  client_id: string | null;
  squad_id: string | null;
  created_by: string;
  google_space_id: string;
  meeting_uri: string;
  meeting_code: string;
  conference_record_id: string | null;
  status: string;
  title: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  transcript_status: string;
  raw_transcript: string | null;
  ai_summary: string | null;
  ai_action_items: any[] | null;
  transcript_doc_url: string | null;
  recording_url: string | null;
  recording_drive_file_id: string | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string } | null;
  teams?: { name: string } | null;
}

export function useGoogleMeetMeetings() {
  const { activeCompany } = useCompany();
  const [meetings, setMeetings] = useState<GoogleMeetMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const companyId = activeCompany?.company_id;

  const fetchMeetings = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('google_meet_meetings')
        .select('*, clients(name), teams(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetings((data as any[]) || []);
    } catch (err: any) {
      console.error('Error fetching meetings:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const createMeeting = async (data: {
    title: string;
    clientId?: string;
    squadId?: string;
    scheduledAt?: string;
    participants?: { email: string; name: string; type: string }[];
    timezoneOffset?: number;
  }) => {
    if (!companyId) return null;
    try {
      setCreating(true);
      const { data: result, error } = await supabase.functions.invoke('google-meet-create', {
        body: {
          title: data.title,
          clientId: data.clientId,
          squadId: data.squadId,
          scheduledAt: data.scheduledAt,
          companyId,
          participants: data.participants,
          timezoneOffset: data.timezoneOffset,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      toast.success('Reunião criada com sucesso!');
      await fetchMeetings();
      return result.meeting;
    } catch (err: any) {
      console.error('Error creating meeting:', err);
      toast.error(err.message || 'Erro ao criar reunião');
      return null;
    } finally {
      setCreating(false);
    }
  };

  const updateMeeting = async (meetingId: string, data: {
    title?: string;
    clientId?: string | null;
    squadId?: string | null;
    scheduledAt?: string | null;
  }) => {
    if (!companyId) return false;
    try {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.clientId !== undefined) updateData.client_id = data.clientId;
      if (data.squadId !== undefined) updateData.squad_id = data.squadId;
      if (data.scheduledAt !== undefined) updateData.scheduled_at = data.scheduledAt;

      const { error } = await supabase
        .from('google_meet_meetings')
        .update(updateData)
        .eq('id', meetingId)
        .eq('company_id', companyId);

      if (error) throw error;

      toast.success('Reunião atualizada com sucesso!');
      await fetchMeetings();
      return true;
    } catch (err: any) {
      console.error('Error updating meeting:', err);
      toast.error(err.message || 'Erro ao atualizar reunião');
      return false;
    }
  };

  const deleteMeeting = async (meetingId: string) => {
    if (!companyId) return false;
    try {
      const { error } = await supabase
        .from('google_meet_meetings')
        .delete()
        .eq('id', meetingId)
        .eq('company_id', companyId);

      if (error) throw error;

      toast.success('Reunião excluída com sucesso!');
      await fetchMeetings();
      return true;
    } catch (err: any) {
      console.error('Error deleting meeting:', err);
      toast.error(err.message || 'Erro ao excluir reunião');
      return false;
    }
  };

  const checkTranscript = async (meetingId: string) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('google-meet-check-transcript', {
        body: { meetingId },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      if (result.success) {
        toast.success('Transcrição capturada com sucesso!');
      } else {
        toast.info(result.message || 'Transcrição ainda não disponível');
      }

      await fetchMeetings();
      return result;
    } catch (err: any) {
      console.error('Error checking transcript:', err);
      toast.error(err.message || 'Erro ao buscar transcrição');
      return null;
    }
  };

  const processSummary = async (meetingId: string) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('google-meet-process-summary', {
        body: { meetingId },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      toast.success('Resumo gerado com sucesso!');
      await fetchMeetings();
      return result;
    } catch (err: any) {
      console.error('Error processing summary:', err);
      toast.error(err.message || 'Erro ao gerar resumo');
      return null;
    }
  };

  return {
    meetings,
    loading,
    creating,
    fetchMeetings,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    checkTranscript,
    processSummary,
  };
}
