
-- Table to associate multiple clients with a task
CREATE TABLE public.task_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate client-task associations
CREATE UNIQUE INDEX idx_task_clients_unique ON public.task_clients(task_id, client_id);
CREATE INDEX idx_task_clients_task ON public.task_clients(task_id);
CREATE INDEX idx_task_clients_client ON public.task_clients(client_id);

ALTER TABLE public.task_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task_clients in their company"
  ON public.task_clients FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert task_clients in their company"
  ON public.task_clients FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete task_clients in their company"
  ON public.task_clients FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Table to associate contact persons with a task-client relationship
CREATE TABLE public.task_client_contact_persons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_client_id UUID NOT NULL REFERENCES public.task_clients(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.whatsapp_client_contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_task_client_contacts_unique ON public.task_client_contact_persons(task_client_id, contact_id);
CREATE INDEX idx_task_client_contacts_task_client ON public.task_client_contact_persons(task_client_id);

ALTER TABLE public.task_client_contact_persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task_client_contacts in their company"
  ON public.task_client_contact_persons FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert task_client_contacts in their company"
  ON public.task_client_contact_persons FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete task_client_contacts in their company"
  ON public.task_client_contact_persons FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));
