-- PARTE 1: Adicionar campos de "Cliente Pausado" na tabela clients
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS paused_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS pause_reason text;

-- Criar índice para queries de clientes pausados
CREATE INDEX IF NOT EXISTS idx_clients_is_paused ON public.clients(is_paused) WHERE is_paused = true;

-- PARTE 2: Adicionar campos de "Conta Restrita" na tabela facebook_ad_accounts
ALTER TABLE public.facebook_ad_accounts
ADD COLUMN IF NOT EXISTS is_restricted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS restriction_reason text,
ADD COLUMN IF NOT EXISTS can_advertise boolean NOT NULL DEFAULT true;

-- Criar índice para queries de contas restritas
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_restricted ON public.facebook_ad_accounts(is_restricted) WHERE is_restricted = true;

-- Comentários para documentação
COMMENT ON COLUMN public.clients.is_paused IS 'Cliente pediu para pausar temporariamente - não sincroniza nem aparece em alertas';
COMMENT ON COLUMN public.clients.paused_at IS 'Data/hora em que o cliente foi pausado';
COMMENT ON COLUMN public.clients.pause_reason IS 'Motivo informado para a pausa';
COMMENT ON COLUMN public.facebook_ad_accounts.is_restricted IS 'Indica se a conta está restrita pelo Meta';
COMMENT ON COLUMN public.facebook_ad_accounts.restriction_reason IS 'Motivo da restrição em texto amigável';
COMMENT ON COLUMN public.facebook_ad_accounts.can_advertise IS 'Se a conta pode veicular anúncios';