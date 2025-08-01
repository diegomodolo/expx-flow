-- Create enum types for better data integrity
CREATE TYPE public.client_status AS ENUM ('green', 'yellow', 'red');
CREATE TYPE public.campaign_status AS ENUM ('active', 'paused', 'finished');
CREATE TYPE public.task_status AS ENUM ('todo', 'progress', 'review', 'done');
CREATE TYPE public.task_priority AS ENUM ('high', 'medium', 'low');

-- Create clients table
CREATE TABLE public.clients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT NOT NULL,
    sector TEXT NOT NULL,
    status public.client_status NOT NULL DEFAULT 'green',
    active_campaigns INTEGER NOT NULL DEFAULT 0,
    avg_cpl DECIMAL(10,2) NOT NULL DEFAULT 0,
    last_access TEXT,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teams table
CREATE TABLE public.teams (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    icon_color TEXT NOT NULL,
    icon_bg TEXT NOT NULL,
    color TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    active_tasks INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team members table
CREATE TABLE public.team_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaigns table
CREATE TABLE public.campaigns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    platforms TEXT NOT NULL,
    status public.campaign_status NOT NULL DEFAULT 'active',
    ctr DECIMAL(5,2) NOT NULL DEFAULT 0,
    cpc DECIMAL(10,2) NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    period TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    responsible_name TEXT NOT NULL,
    responsible_avatar TEXT,
    status public.task_status NOT NULL DEFAULT 'todo',
    priority public.task_priority NOT NULL DEFAULT 'medium',
    deadline DATE NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients
CREATE POLICY "Users can view their own clients" ON public.clients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients" ON public.clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" ON public.clients
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" ON public.clients
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for teams
CREATE POLICY "Users can view their own teams" ON public.teams
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own teams" ON public.teams
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own teams" ON public.teams
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own teams" ON public.teams
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for team members
CREATE POLICY "Users can view team members from their teams" ON public.team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.teams 
            WHERE teams.id = team_members.team_id 
            AND teams.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create team members for their teams" ON public.team_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.teams 
            WHERE teams.id = team_members.team_id 
            AND teams.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update team members from their teams" ON public.team_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.teams 
            WHERE teams.id = team_members.team_id 
            AND teams.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete team members from their teams" ON public.team_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.teams 
            WHERE teams.id = team_members.team_id 
            AND teams.user_id = auth.uid()
        )
    );

-- Create RLS policies for campaigns
CREATE POLICY "Users can view their own campaigns" ON public.campaigns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns" ON public.campaigns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON public.campaigns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON public.campaigns
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for tasks
CREATE POLICY "Users can view their own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updating timestamps
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update team progress and active tasks count
CREATE OR REPLACE FUNCTION public.update_team_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.teams 
    SET 
        active_tasks = (
            SELECT COUNT(*) 
            FROM public.tasks 
            WHERE team_id = COALESCE(NEW.team_id, OLD.team_id) 
            AND status != 'done'
        ),
        progress = (
            SELECT COALESCE(AVG(progress), 0)::INTEGER
            FROM public.tasks 
            WHERE team_id = COALESCE(NEW.team_id, OLD.team_id)
        )
    WHERE id = COALESCE(NEW.team_id, OLD.team_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to update team stats when tasks change
CREATE TRIGGER update_team_stats_on_task_insert
    AFTER INSERT ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_team_stats();

CREATE TRIGGER update_team_stats_on_task_update
    AFTER UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_team_stats();

CREATE TRIGGER update_team_stats_on_task_delete
    AFTER DELETE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_team_stats();

-- Create function to update client campaign stats
CREATE OR REPLACE FUNCTION public.update_client_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.clients 
    SET 
        active_campaigns = (
            SELECT COUNT(*) 
            FROM public.campaigns 
            WHERE client_id = COALESCE(NEW.client_id, OLD.client_id) 
            AND status = 'active'
        ),
        avg_cpl = (
            SELECT COALESCE(AVG(cpc), 0)
            FROM public.campaigns 
            WHERE client_id = COALESCE(NEW.client_id, OLD.client_id)
        )
    WHERE id = COALESCE(NEW.client_id, OLD.client_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to update client stats when campaigns change
CREATE TRIGGER update_client_stats_on_campaign_insert
    AFTER INSERT ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_client_stats();

CREATE TRIGGER update_client_stats_on_campaign_update
    AFTER UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_client_stats();

CREATE TRIGGER update_client_stats_on_campaign_delete
    AFTER DELETE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_client_stats();