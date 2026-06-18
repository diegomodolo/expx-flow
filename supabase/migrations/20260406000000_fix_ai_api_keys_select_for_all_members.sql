-- Fix: permitir que todos os membros da empresa leiam se a chave existe
-- Apenas owners podem inserir/atualizar, mas qualquer membro pode VER que a chave existe
--
-- Problema: a policy anterior só permitia OWNERS verem o registro de ai_api_keys.
-- Usuários não-owner recebiam data: null e o frontend mostrava "Chave não configurada"
-- mesmo a chave estando configurada pelo owner.

-- Remove a policy restritiva de SELECT (só owners)
DROP POLICY IF EXISTS "Owners can view api keys" ON public.ai_api_keys;
DO $$ BEGIN
  CREATE POLICY "Members can view api keys for their company"
  ON public.ai_api_keys FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
