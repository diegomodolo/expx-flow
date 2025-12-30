-- Create content_plans table (Projetos de Planejamento de Conteúdo)
CREATE TABLE public.content_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'em_revisao', 'aprovado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create content_plan_posts table (Posts do Planejamento)
CREATE TABLE public.content_plan_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_plan_id UUID NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  post_type TEXT NOT NULL DEFAULT 'estatico' CHECK (post_type IN ('estatico', 'carrossel', 'reels')),
  objective TEXT,
  headline TEXT,
  subheadline TEXT,
  caption TEXT,
  script JSONB,
  scheduled_date DATE,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado', 'enviado_criativo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create content_plan_slides table (Slides de Carrossel)
CREATE TABLE public.content_plan_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.content_plan_posts(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  headline TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_plan_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_plan_slides ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_plans
CREATE POLICY "Users can view content plans from their company"
  ON public.content_plans FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create content plans for their company"
  ON public.content_plans FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update content plans from their company"
  ON public.content_plans FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete content plans from their company"
  ON public.content_plans FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

-- RLS policies for content_plan_posts (via content_plan)
CREATE POLICY "Users can view posts from their company plans"
  ON public.content_plan_posts FOR SELECT
  USING (content_plan_id IN (
    SELECT id FROM public.content_plans WHERE company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can create posts for their company plans"
  ON public.content_plan_posts FOR INSERT
  WITH CHECK (content_plan_id IN (
    SELECT id FROM public.content_plans WHERE company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update posts from their company plans"
  ON public.content_plan_posts FOR UPDATE
  USING (content_plan_id IN (
    SELECT id FROM public.content_plans WHERE company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete posts from their company plans"
  ON public.content_plan_posts FOR DELETE
  USING (content_plan_id IN (
    SELECT id FROM public.content_plans WHERE company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  ));

-- RLS policies for content_plan_slides (via post -> content_plan)
CREATE POLICY "Users can view slides from their company plans"
  ON public.content_plan_slides FOR SELECT
  USING (post_id IN (
    SELECT id FROM public.content_plan_posts WHERE content_plan_id IN (
      SELECT id FROM public.content_plans WHERE company_id IN (
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can create slides for their company plans"
  ON public.content_plan_slides FOR INSERT
  WITH CHECK (post_id IN (
    SELECT id FROM public.content_plan_posts WHERE content_plan_id IN (
      SELECT id FROM public.content_plans WHERE company_id IN (
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can update slides from their company plans"
  ON public.content_plan_slides FOR UPDATE
  USING (post_id IN (
    SELECT id FROM public.content_plan_posts WHERE content_plan_id IN (
      SELECT id FROM public.content_plans WHERE company_id IN (
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can delete slides from their company plans"
  ON public.content_plan_slides FOR DELETE
  USING (post_id IN (
    SELECT id FROM public.content_plan_posts WHERE content_plan_id IN (
      SELECT id FROM public.content_plans WHERE company_id IN (
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
      )
    )
  ));

-- Create indexes for performance
CREATE INDEX idx_content_plans_client ON public.content_plans(client_id);
CREATE INDEX idx_content_plans_company ON public.content_plans(company_id);
CREATE INDEX idx_content_plan_posts_plan ON public.content_plan_posts(content_plan_id);
CREATE INDEX idx_content_plan_slides_post ON public.content_plan_slides(post_id);

-- Trigger for updated_at on content_plans
CREATE TRIGGER update_content_plans_updated_at
  BEFORE UPDATE ON public.content_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on content_plan_posts
CREATE TRIGGER update_content_plan_posts_updated_at
  BEFORE UPDATE ON public.content_plan_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();