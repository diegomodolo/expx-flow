-- Adiciona credenciais SIP do ramal para o webphone embutido
ALTER TABLE public.whatsapp_configs
  ADD COLUMN IF NOT EXISTS api4com_domain TEXT,
  ADD COLUMN IF NOT EXISTS api4com_password TEXT;

COMMENT ON COLUMN public.whatsapp_configs.api4com_domain IS 'Domínio SIP da conta API4Com (ex: expx.api4com.com)';
COMMENT ON COLUMN public.whatsapp_configs.api4com_password IS 'Senha do ramal SIP para autenticação no webphone';
