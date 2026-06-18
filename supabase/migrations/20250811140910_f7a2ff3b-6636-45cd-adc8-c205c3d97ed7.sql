-- Create table for client notes with attribution and deletion constraints
create table IF NOT EXISTS public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  company_id uuid not null,
  user_id uuid not null,
  content text not null,
  created_at timestamptz not null default now()
);;

-- Indexes
create index IF NOT EXISTS idx_client_notes_client_id on public.client_notes(client_id);;

create index IF NOT EXISTS idx_client_notes_company_id on public.client_notes(company_id);;

create index IF NOT EXISTS idx_client_notes_created_at on public.client_notes(created_at desc);;

DO $$ BEGIN
  alter table public.client_notes
  add constraint client_notes_client_fk
  foreign key (client_id) references public.clients(id) on delete cascade;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  alter table public.client_notes
  add constraint client_notes_company_fk
  foreign key (company_id) references public.companies(id) on delete cascade;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;



-- Enable RLS
alter table public.client_notes enable row level security;
DO $$ BEGIN
  create policy "Company members can view client notes"
  on public.client_notes
  for select
  using (
    company_id in (
      select company_members.company_id from public.company_members
      where company_members.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  create policy "Company members can create client notes"
  on public.client_notes
  for insert
  with check (
    company_id in (
      select company_members.company_id from public.company_members
      where company_members.user_id = auth.uid()
    ) and user_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;

DO $$ BEGIN
  create policy "Note owners can delete their client notes"
  on public.client_notes
  for delete
  using (
    user_id = auth.uid() and company_id in (
      select company_members.company_id from public.company_members
      where company_members.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;
