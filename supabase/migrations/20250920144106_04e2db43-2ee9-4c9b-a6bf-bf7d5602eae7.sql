-- Verificar e criar políticas RLS para o bucket lead-evidence

-- Política para permitir SELECT (ver arquivos) no bucket lead-evidence
CREATE POLICY "Company members can view lead evidence files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'lead-evidence' 
  AND name SIMILAR TO '[0-9a-fA-F\-]+/.*'
  AND SUBSTRING(name FROM '^([0-9a-fA-F\-]+)/') IN (
    SELECT CAST(c.id AS TEXT)
    FROM public.clients c
    INNER JOIN public.company_members cm ON c.company_id = cm.company_id
    WHERE cm.user_id = auth.uid()
  )
);

-- Política para permitir download/acesso aos arquivos  
CREATE POLICY "Company members can download lead evidence files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'lead-evidence' 
  AND name SIMILAR TO '[0-9a-fA-F\-]+/.*'
  AND SUBSTRING(name FROM '^([0-9a-fA-F\-]+)/') IN (
    SELECT CAST(c.id AS TEXT)
    FROM public.clients c
    INNER JOIN public.company_members cm ON c.company_id = cm.company_id
    WHERE cm.user_id = auth.uid()
  )
);