-- Adicionar campos para controle de visualização de leads desqualificados
ALTER TABLE public.lead_disqualification_reports 
ADD COLUMN viewed_at timestamp with time zone,
ADD COLUMN viewed_by uuid;