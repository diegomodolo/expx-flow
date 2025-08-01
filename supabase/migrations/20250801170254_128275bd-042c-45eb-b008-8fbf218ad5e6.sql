-- Create companies table for multi-tenant architecture
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company members table for user-company relationships
CREATE TABLE public.company_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT company_members_role_check CHECK (role IN ('owner', 'admin', 'member')),
  CONSTRAINT company_members_unique_user_company UNIQUE (user_id, company_id)
);

-- Create company invites table for pending invitations
CREATE TABLE public.company_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT company_invites_role_check CHECK (role IN ('admin', 'member')),
  CONSTRAINT company_invites_unique_email_company UNIQUE (email, company_id)
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can view companies they are members of" 
ON public.companies 
FOR SELECT 
USING (
  id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create companies" 
ON public.companies 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Company owners and admins can update company" 
ON public.companies 
FOR UPDATE 
USING (
  id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- RLS Policies for company_members
CREATE POLICY "Users can view members of their companies" 
ON public.company_members 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members AS cm 
    WHERE cm.user_id = auth.uid()
  )
);

CREATE POLICY "Company owners and admins can manage members" 
ON public.company_members 
FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can view their own membership" 
ON public.company_members 
FOR SELECT 
USING (user_id = auth.uid());

-- RLS Policies for company_invites  
CREATE POLICY "Company owners and admins can manage invites" 
ON public.company_invites 
FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.company_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Create triggers for timestamp updates
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_members_updated_at
BEFORE UPDATE ON public.company_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create initial company membership when company is created
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER AS $$
BEGIN
  -- Create owner membership for company creator
  INSERT INTO public.company_members (user_id, company_id, role, joined_at)
  VALUES (NEW.created_by, NEW.id, 'owner', now());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create company owner membership
CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();