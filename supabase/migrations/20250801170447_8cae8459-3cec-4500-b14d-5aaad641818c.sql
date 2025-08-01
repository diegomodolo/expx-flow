-- Add company_id to existing tables for multi-tenant architecture
-- This will temporarily break existing functionality until we populate the data

-- Add company_id to employees table
ALTER TABLE public.employees ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add company_id to clients table  
ALTER TABLE public.clients ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add company_id to campaigns table
ALTER TABLE public.campaigns ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add company_id to tasks table
ALTER TABLE public.tasks ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add company_id to teams table
ALTER TABLE public.teams ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add company_id to sectors table
ALTER TABLE public.sectors ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Update RLS policies for employees table
DROP POLICY IF EXISTS "Users can view their own employees" ON public.employees;
DROP POLICY IF EXISTS "Users can create their own employees" ON public.employees;
DROP POLICY IF EXISTS "Users can update their own employees" ON public.employees;
DROP POLICY IF EXISTS "Users can delete their own employees" ON public.employees;

CREATE POLICY "Company members can view employees" 
ON public.employees 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can create employees" 
ON public.employees 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Company admins can update employees" 
ON public.employees 
FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Company admins can delete employees" 
ON public.employees 
FOR DELETE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Update RLS policies for clients table
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

CREATE POLICY "Company members can view clients" 
ON public.clients 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can create clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can update clients" 
ON public.clients 
FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can delete clients" 
ON public.clients 
FOR DELETE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

-- Update RLS policies for campaigns table
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can create their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON public.campaigns;

CREATE POLICY "Company members can view campaigns" 
ON public.campaigns 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can create campaigns" 
ON public.campaigns 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can update campaigns" 
ON public.campaigns 
FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can delete campaigns" 
ON public.campaigns 
FOR DELETE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

-- Update RLS policies for tasks table
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "Company members can view tasks" 
ON public.tasks 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can update tasks" 
ON public.tasks 
FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can delete tasks" 
ON public.tasks 
FOR DELETE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

-- Update RLS policies for teams table
DROP POLICY IF EXISTS "Users can view their own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can create their own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can update their own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can delete their own teams" ON public.teams;

CREATE POLICY "Company members can view teams" 
ON public.teams 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can create teams" 
ON public.teams 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can update teams" 
ON public.teams 
FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can delete teams" 
ON public.teams 
FOR DELETE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

-- Update RLS policies for sectors table
DROP POLICY IF EXISTS "Users can view their own sectors" ON public.sectors;
DROP POLICY IF EXISTS "Users can create their own sectors" ON public.sectors;
DROP POLICY IF EXISTS "Users can update their own sectors" ON public.sectors;
DROP POLICY IF EXISTS "Users can delete their own sectors" ON public.sectors;

CREATE POLICY "Company members can view sectors" 
ON public.sectors 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can create sectors" 
ON public.sectors 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can update sectors" 
ON public.sectors 
FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company members can delete sectors" 
ON public.sectors 
FOR DELETE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);