-- Private image storage for SkillSync profiles, groups, and projects.
-- Run once in Supabase Dashboard → SQL Editor after schema.sql and privacy-migration.sql.

alter table public.profiles add column if not exists skills text not null default '';
alter table public.groups add column if not exists image_path text;
alter table public.projects add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-images', 'community-images', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "community images readable by authorized members" on storage.objects;
create policy "community images readable by authorized members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'community-images'
    and (
      (storage.foldername(name))[1] = 'profiles'
      or (
        (storage.foldername(name))[1] = 'groups'
        and exists (
          select 1 from public.groups g
          where g.id = (storage.foldername(name))[2]::uuid
            and public.can_view_group(g.id, auth.uid())
        )
      )
      or (
        (storage.foldername(name))[1] = 'projects'
        and exists (select 1 from public.projects p where p.id = (storage.foldername(name))[2]::uuid)
      )
    )
  );

drop policy if exists "owners upload community images" on storage.objects;
create policy "owners upload community images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'community-images'
    and (
      ((storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = auth.uid()::text)
      or ((storage.foldername(name))[1] = 'groups' and exists (
        select 1 from public.groups g where g.id = (storage.foldername(name))[2]::uuid and g.owner_id = auth.uid()
      ))
      or ((storage.foldername(name))[1] = 'projects' and exists (
        select 1 from public.projects p where p.id = (storage.foldername(name))[2]::uuid and p.owner_id = auth.uid()
      ))
    )
  );

drop policy if exists "owners replace community images" on storage.objects;
create policy "owners replace community images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'community-images'
    and (
      ((storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = auth.uid()::text)
      or ((storage.foldername(name))[1] = 'groups' and exists (
        select 1 from public.groups g where g.id = (storage.foldername(name))[2]::uuid and g.owner_id = auth.uid()
      ))
      or ((storage.foldername(name))[1] = 'projects' and exists (
        select 1 from public.projects p where p.id = (storage.foldername(name))[2]::uuid and p.owner_id = auth.uid()
      ))
    )
  )
  with check (
    bucket_id = 'community-images'
    and (
      ((storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = auth.uid()::text)
      or ((storage.foldername(name))[1] = 'groups' and exists (
        select 1 from public.groups g where g.id = (storage.foldername(name))[2]::uuid and g.owner_id = auth.uid()
      ))
      or ((storage.foldername(name))[1] = 'projects' and exists (
        select 1 from public.projects p where p.id = (storage.foldername(name))[2]::uuid and p.owner_id = auth.uid()
      ))
    )
  );

drop policy if exists "owners delete community images" on storage.objects;
create policy "owners delete community images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'community-images'
    and (
      ((storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = auth.uid()::text)
      or ((storage.foldername(name))[1] = 'groups' and exists (
        select 1 from public.groups g where g.id = (storage.foldername(name))[2]::uuid and g.owner_id = auth.uid()
      ))
      or ((storage.foldername(name))[1] = 'projects' and exists (
        select 1 from public.projects p where p.id = (storage.foldername(name))[2]::uuid and p.owner_id = auth.uid()
      ))
    )
  );
