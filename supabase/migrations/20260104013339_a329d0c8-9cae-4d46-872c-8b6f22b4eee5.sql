-- Improve performance for Repositório de Criativos (order/filter on ad_generation_queue)

CREATE INDEX IF NOT EXISTS ad_generation_queue_company_created_at_idx
ON public.ad_generation_queue (company_id, created_at);

CREATE INDEX IF NOT EXISTS ad_generation_queue_company_client_created_at_idx
ON public.ad_generation_queue (company_id, client_id, created_at);