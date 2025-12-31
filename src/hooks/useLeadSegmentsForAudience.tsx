import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';

export interface LeadSegment {
  id: string;
  name: string;
  description?: string;
  leadCount: number;
}

interface CreatedAudience {
  id: string;
  name: string;
}

export function useLeadSegmentsForAudience(clientId: string | null) {
  const [segments, setSegments] = useState<LeadSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchSegments = useCallback(async () => {
    if (!activeCompany?.company_id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch segments
      const { data: segmentsData, error: segmentsError } = await supabase
        .from('lead_segments')
        .select('id, name, description')
        .eq('company_id', activeCompany.company_id)
        .eq('is_active', true);

      if (segmentsError) throw segmentsError;

      // Get counts separately
      const formattedSegments: LeadSegment[] = await Promise.all(
        (segmentsData || []).map(async (seg) => {
          const { count } = await supabase
            .from('lead_segment_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('segment_id', seg.id);
          
          return {
            id: seg.id,
            name: seg.name,
            description: seg.description || undefined,
            leadCount: count || 0,
          };
        })
      );

      setSegments(formattedSegments);
    } catch (err: any) {
      console.error('Error fetching lead segments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeCompany?.company_id]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const createAudienceFromSegment = useCallback(async (
    segmentId: string
  ): Promise<CreatedAudience | null> => {
    if (!clientId || !activeCompany?.company_id) {
      toast({
        title: 'Erro',
        description: 'Cliente ou empresa não identificados',
        variant: 'destructive',
      });
      return null;
    }

    const segment = segments.find(s => s.id === segmentId);
    if (!segment) {
      toast({
        title: 'Erro',
        description: 'Segmento não encontrado',
        variant: 'destructive',
      });
      return null;
    }

    setLoading(true);

    try {
      // 1. Fetch leads from the segment
      const { data: assignments, error: assignmentsError } = await supabase
        .from('lead_segment_assignments')
        .select('lead_id')
        .eq('segment_id', segmentId);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        toast({
          title: 'Segmento vazio',
          description: 'Este segmento não possui leads atribuídos',
          variant: 'destructive',
        });
        return null;
      }

      const leadIds = assignments.map(a => a.lead_id);

      // 2. Fetch lead details from lead_pool (email/phone)
      const { data: leads, error: leadsError } = await supabase
        .from('lead_pool')
        .select('id, email, phone, name')
        .in('id', leadIds);

      if (leadsError) throw leadsError;

      // 3. Create audience in Meta
      const audienceName = `Segmento: ${segment.name}`;
      const { data: createData, error: createError } = await supabase.functions.invoke(
        'manage-meta-audiences',
        {
          body: {
            action: 'create',
            clientId,
            name: audienceName,
            description: `Público criado a partir do segmento "${segment.name}" com ${leads?.length || 0} leads`,
          },
        }
      );

      if (createError) throw createError;
      if (!createData?.success) throw new Error(createData?.error || 'Erro ao criar público');

      const audienceId = createData.audience?.id;

      // 4. Add users to the audience
      const users = (leads || [])
        .filter((l: any) => l.email || l.phone)
        .map((l: any) => ({
          email: l.email || undefined,
          phone: l.phone || undefined,
          firstName: l.name?.split(' ')[0] || undefined,
          lastName: l.name?.split(' ').slice(1).join(' ') || undefined,
        }));

      if (users.length > 0) {
        const { data: addData, error: addError } = await supabase.functions.invoke(
          'manage-audience-users',
          {
            body: {
              action: 'add',
              clientId,
              audienceId,
              users,
            },
          }
        );

        if (addError) {
          console.error('Error adding users to audience:', addError);
          // Don't throw - audience was created, just couldn't add users
        }
      }

      toast({
        title: 'Público criado!',
        description: `"${audienceName}" foi criado com ${users.length} leads. Pode levar algumas horas para sincronizar.`,
      });

      return {
        id: audienceId,
        name: audienceName,
      };
    } catch (err: any) {
      console.error('Error creating audience from segment:', err);
      toast({
        title: 'Erro ao criar público',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [clientId, activeCompany?.company_id, segments, toast]);

  return {
    segments,
    loading,
    error,
    fetchSegments,
    createAudienceFromSegment,
  };
}
