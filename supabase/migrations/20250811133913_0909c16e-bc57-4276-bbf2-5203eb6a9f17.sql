-- Create table for client notes with attribution and deletion constraints
create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  company_id uuid not null,
  user_id uuid not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Add helpful indexes
create index if not exists idx_client_notes_client_id on public.client_notes(client_id);
create index if not exists idx_client_notes_company_id on public.client_notes(company_id);
create index if not exists idx_client_notes_created_at on public.client_notes(created_at desc);

-- Foreign keys to existing public tables (avoid referencing auth schema directly)
alter table public.client_notes
  add constraint client_notes_client_fk
  foreign key (client_id) references public.clients(id) on delete cascade;

alter table public.client_notes
  add constraint client_notes_company_fk
  foreign key (company_id) references public.companies(id) on delete cascade;

-- Enable RLS
alter table public.client_notes enable row level security;

-- Policies
-- Company members can view notes
create policy if not exists "Company members can view client notes"
  on public.client_notes
  for select
  using (
    company_id in (
      select company_members.company_id from public.company_members
      where company_members.user_id = auth.uid()
    )
  );

-- Company members can create notes (must be for their company and by themselves)
create policy if not exists "Company members can create client notes"
  on public.client_notes
  for insert
  with check (
    company_id in (
      select company_members.company_id from public.company_members
      where company_members.user_id = auth.uid()
    )
    and user_id = auth.uid()
  );

-- Only note owner can delete their note (and must belong to company)
create policy if not exists "Note owners can delete their client notes"
  on public.client_notes
  for delete
  using (
    user_id = auth.uid() and company_id in (
      select company_members.company_id from public.company_members
      where company_members.user_id = auth.uid()
    )
  );
