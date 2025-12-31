-- Create bucket for generated video creatives (idempotent)
insert into storage.buckets (id, name, public)
values ('visual-creatives', 'visual-creatives', true)
on conflict (id) do nothing;

-- Allow public read access to objects in this bucket (needed for getPublicUrl usage)
-- Note: storage.objects already has RLS enabled in Supabase projects.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read visual-creatives'
  ) then
    create policy "Public read visual-creatives"
    on storage.objects
    for select
    using (bucket_id = 'visual-creatives');
  end if;
end $$;