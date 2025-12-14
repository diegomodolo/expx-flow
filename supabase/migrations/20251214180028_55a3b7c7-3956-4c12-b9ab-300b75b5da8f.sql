-- Adicionar campos para vincular cliente a página Facebook e conta Instagram
ALTER TABLE public.clients 
ADD COLUMN facebook_page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
ADD COLUMN instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX idx_clients_facebook_page_id ON public.clients(facebook_page_id);
CREATE INDEX idx_clients_instagram_account_id ON public.clients(instagram_account_id);