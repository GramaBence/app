-- SkillSync access modes and secure join codes.
-- Run once in Supabase Dashboard → SQL Editor after deploying the matching app code.

alter table public.groups
  add column if not exists access_mode text not null default 'public';

alter table public.projects
  add column if not exists access_mode text not null default 'public';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'groups_access_mode_check' and conrelid = 'public.groups'::regclass) then
    alter table public.groups add constraint groups_access_mode_check
      check (access_mode in ('public', 'invite_code', 'password')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'projects_access_mode_check' and conrelid = 'public.projects'::regclass) then
    alter table public.projects add constraint projects_access_mode_check
      check (access_mode in ('public', 'invite_code')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'projects_group_required' and conrelid = 'public.projects'::regclass) then
    alter table public.projects add constraint projects_group_required
      check (group_id is not null) not valid;
  end if;
end $$;

create table if not exists public.group_access_codes (
  group_id uuid primary key references public.groups(id) on delete cascade,
  code_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.project_access_codes (
  project_id uuid primary key references public.projects(id) on delete cascade,
  code_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.group_access_codes enable row level security;
alter table public.project_access_codes enable row level security;
revoke all on public.group_access_codes, public.project_access_codes from anon, authenticated;

create or replace function public.can_view_group(p_group_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
  select 1 from public.groups g
    where g.id = p_group_id and (
      g.access_mode = 'public' or g.owner_id = auth.uid() or exists (
        select 1 from public.group_members gm
        where gm.group_id = g.id and gm.profile_id = auth.uid()
      )
    )
  );
$$;

create or replace function public.get_group_preview(p_group_id uuid)
returns table (id uuid, owner_id uuid, name text, description text, topic text, access_mode text, owner_name text)
language sql stable security definer set search_path = '' as $$
  select g.id, g.owner_id, g.name, g.description, g.topic, g.access_mode, p.full_name
  from public.groups g
  left join public.profiles p on p.id = g.owner_id
  where g.id = p_group_id;
$$;

create or replace function public.create_group_with_access(
  p_name text,
  p_description text,
  p_topic text,
  p_access_mode text,
  p_code text
)
returns uuid language plpgsql security definer set search_path = 'pg_catalog, public, extensions' as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
begin
  if v_user_id is null then raise exception 'A csoport létrehozásához jelentkezz be.'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 3 then raise exception 'A csoport neve legalább 3 karakter legyen.'; end if;
  if char_length(trim(coalesce(p_description, ''))) < 10 then raise exception 'A csoport leírása legalább 10 karakter legyen.'; end if;
  if p_access_mode is null or p_access_mode not in ('public', 'invite_code', 'password') then raise exception 'Érvénytelen csoport-hozzáférési mód.'; end if;
  if p_access_mode <> 'public' and char_length(coalesce(p_code, '')) < 6 then
    raise exception 'A meghívókód vagy jelszó legalább 6 karakter legyen.';
  end if;

  insert into public.groups(owner_id, name, description, topic, access_mode)
  values (v_user_id, trim(p_name), trim(p_description), coalesce(nullif(trim(p_topic), ''), 'Vegyes'), p_access_mode)
  returning id into v_group_id;

  insert into public.group_members(group_id, profile_id) values (v_group_id, v_user_id);

  if p_access_mode <> 'public' then
    insert into public.group_access_codes(group_id, code_hash)
    values (v_group_id, extensions.crypt(p_code, extensions.gen_salt('bf')));
  end if;

  return v_group_id;
end;
$$;

create or replace function public.set_group_access_code(p_group_id uuid, p_code text)
returns void language plpgsql security definer set search_path = 'pg_catalog, public, extensions' as $$
declare v_mode text;
begin
  select access_mode into v_mode from public.groups
  where id = p_group_id and owner_id = auth.uid();
  if not found then raise exception 'A csoportot csak a tulajdonosa állíthatja be.'; end if;
  if v_mode = 'public' then
    delete from public.group_access_codes where group_id = p_group_id;
    return;
  end if;
  if p_code is null or char_length(p_code) < 6 then
    raise exception 'A kód vagy jelszó legalább 6 karakter legyen.';
  end if;
  insert into public.group_access_codes(group_id, code_hash)
  values (p_group_id, extensions.crypt(p_code, extensions.gen_salt('bf')))
  on conflict (group_id) do update set code_hash = excluded.code_hash, updated_at = now();
end;
$$;

create or replace function public.join_group_with_code(p_group_id uuid, p_code text)
returns void language plpgsql security definer set search_path = 'pg_catalog, public, extensions' as $$
declare v_mode text; v_hash text;
begin
  select access_mode into v_mode from public.groups where id = p_group_id;
  if not found then raise exception 'Nem találjuk ezt a csoportot.'; end if;
  if v_mode = 'public' then
    insert into public.group_members(group_id, profile_id) values (p_group_id, auth.uid()) on conflict do nothing;
    return;
  end if;
  select code_hash into v_hash from public.group_access_codes where group_id = p_group_id;
  if v_hash is null or extensions.crypt(coalesce(p_code, ''), v_hash) <> v_hash then
    raise exception 'A kód vagy jelszó nem megfelelő.';
  end if;
  insert into public.group_members(group_id, profile_id) values (p_group_id, auth.uid()) on conflict do nothing;
end;
$$;

create or replace function public.set_project_access_code(p_project_id uuid, p_code text)
returns void language plpgsql security definer set search_path = 'pg_catalog, public, extensions' as $$
declare v_mode text;
begin
  select access_mode into v_mode from public.projects
  where id = p_project_id and owner_id = auth.uid();
  if not found then raise exception 'A projekt kódját csak a tulajdonosa állíthatja be.'; end if;
  if v_mode = 'public' then
    delete from public.project_access_codes where project_id = p_project_id;
    return;
  end if;
  if p_code is null or char_length(p_code) < 6 then
    raise exception 'A meghívókód legalább 6 karakter legyen.';
  end if;
  insert into public.project_access_codes(project_id, code_hash)
  values (p_project_id, extensions.crypt(p_code, extensions.gen_salt('bf')))
  on conflict (project_id) do update set code_hash = excluded.code_hash, updated_at = now();
end;
$$;

create or replace function public.join_project_with_code(p_project_id uuid, p_code text)
returns void language plpgsql security definer set search_path = 'pg_catalog, public, extensions' as $$
declare v_mode text; v_hash text; v_group_id uuid;
begin
  select access_mode, group_id into v_mode, v_group_id from public.projects where id = p_project_id;
  if not found then raise exception 'Nem találjuk ezt a projektet.'; end if;
  if v_mode = 'invite_code' then
    select code_hash into v_hash from public.project_access_codes where project_id = p_project_id;
    if v_hash is null or extensions.crypt(coalesce(p_code, ''), v_hash) <> v_hash then
      raise exception 'A meghívókód nem megfelelő.';
    end if;
  elsif v_mode <> 'public' then
    raise exception 'A projekt hozzáférési módja nem érvényes.';
  end if;
  insert into public.project_members(project_id, profile_id, role)
  values (p_project_id, auth.uid(), 'tag') on conflict do nothing;
  if v_group_id is not null and (v_mode = 'invite_code' or exists (
    select 1 from public.groups g where g.id = v_group_id and g.access_mode = 'public'
  )) then
    insert into public.group_members(group_id, profile_id)
    values (v_group_id, auth.uid()) on conflict do nothing;
  end if;
end;
$$;

drop policy if exists "groups readable by members" on public.groups;
drop policy if exists "public groups or approved members can read" on public.groups;
create policy "public groups or approved members can read"
  on public.groups for select to authenticated
  using (public.can_view_group(id, auth.uid()));

drop policy if exists "group memberships readable" on public.group_members;
create policy "group memberships readable" on public.group_members for select to authenticated
  using (public.can_view_group(group_id, auth.uid()));
drop policy if exists "members join groups as themselves" on public.group_members;
drop policy if exists "members join public groups as themselves" on public.group_members;
create policy "members join public groups as themselves" on public.group_members for insert to authenticated
  with check (profile_id = auth.uid() and exists (
    select 1 from public.groups g where g.id = group_id and (g.owner_id = auth.uid() or g.access_mode = 'public')
  ));

drop policy if exists "members create projects" on public.projects;
create policy "members create projects" on public.projects for insert to authenticated with check (
  owner_id = auth.uid() and group_id is not null and exists (
    select 1 from public.group_members gm where gm.group_id = projects.group_id and gm.profile_id = auth.uid()
  )
);

drop policy if exists "members join as themselves" on public.project_members;
drop policy if exists "owners add project members and public projects allow joining" on public.project_members;
create policy "owners add project members and public projects allow joining" on public.project_members
  for insert to authenticated with check (
    profile_id = auth.uid() and (
      exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
    )
  );

revoke all on function public.can_view_group(uuid, uuid) from public, anon;
revoke all on function public.get_group_preview(uuid) from public, anon;
revoke all on function public.create_group_with_access(text, text, text, text, text) from public, anon;
revoke all on function public.set_group_access_code(uuid, text) from public, anon;
revoke all on function public.join_group_with_code(uuid, text) from public, anon;
revoke all on function public.set_project_access_code(uuid, text) from public, anon;
revoke all on function public.join_project_with_code(uuid, text) from public, anon;
grant execute on function public.can_view_group(uuid, uuid) to authenticated;
grant execute on function public.get_group_preview(uuid) to authenticated;
grant execute on function public.create_group_with_access(text, text, text, text, text) to authenticated;
grant execute on function public.set_group_access_code(uuid, text) to authenticated;
grant execute on function public.join_group_with_code(uuid, text) to authenticated;
grant execute on function public.set_project_access_code(uuid, text) to authenticated;
grant execute on function public.join_project_with_code(uuid, text) to authenticated;
