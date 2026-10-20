-- SkillSync: run once in Supabase Dashboard → SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text not null default 'Alkotó',
  bio text not null default '',
  avatar_url text,
  skills text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 90),
  description text not null check (char_length(description) between 10 and 1200),
  category text not null default 'Más',
  status text not null default 'Nyitott' check (status in ('Nyitott','Folyamatban','Kész')),
  image_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'tag' check (role in ('gazda','tag')),
  created_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);

create table if not exists public.project_likes (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  reply_to_id uuid references public.comments(id) on delete cascade,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  recipient_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 70),
  description text not null check (char_length(description) between 10 and 600),
  topic text not null default 'Vegyes',
  image_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

-- Projects can be posted to the open feed or into a group a member belongs to.
alter table public.projects add column if not exists group_id uuid references public.groups(id) on delete set null;
alter table public.profiles add column if not exists skills text not null default '';
alter table public.projects add column if not exists image_path text;
alter table public.groups add column if not exists image_path text;

create index if not exists projects_created_at_idx on public.projects(created_at desc);
create index if not exists comments_project_created_idx on public.comments(project_id, created_at);
create index if not exists comments_reply_to_idx on public.comments(reply_to_id);
create index if not exists comments_recipient_idx on public.comments(recipient_id) where recipient_id is not null;
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(recipient_id) where read_at is null;
create index if not exists groups_created_at_idx on public.groups(created_at desc);
create index if not exists projects_group_id_idx on public.projects(group_id, created_at desc);

-- Create a profile as soon as an account signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'Alkotó'),
    coalesce(nullif(lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'full_name', ''), '[^a-zA-Z0-9]+', '-', 'g')), '') || '-' || substr(new.id::text, 1, 6), 'alkoto-' || substr(new.id::text, 1, 8))
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_likes enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- Community content is readable by signed-in members; each person edits only their own content.
drop policy if exists "profiles readable by members" on public.profiles;
create policy "profiles readable by members" on public.profiles for select to authenticated using (true);
drop policy if exists "profile owner updates profile" on public.profiles;
create policy "profile owner updates profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "projects readable by members" on public.projects;
create policy "projects readable by members" on public.projects for select to authenticated using (true);
drop policy if exists "members create projects" on public.projects;
create policy "members create projects" on public.projects for insert to authenticated with check (
  owner_id = (select auth.uid()) and (
    group_id is null or exists (
      select 1 from public.group_members gm
      where gm.group_id = projects.group_id and gm.profile_id = (select auth.uid())
    )
  )
);
drop policy if exists "owners edit projects" on public.projects;
create policy "owners edit projects" on public.projects for update to authenticated using (owner_id = (select auth.uid())) with check (
  owner_id = (select auth.uid()) and (
    group_id is null or exists (
      select 1 from public.group_members gm
      where gm.group_id = projects.group_id and gm.profile_id = (select auth.uid())
    )
  )
);
drop policy if exists "owners delete projects" on public.projects;
create policy "owners delete projects" on public.projects for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "project memberships readable" on public.project_members;
create policy "project memberships readable" on public.project_members for select to authenticated using (true);
drop policy if exists "members join as themselves" on public.project_members;
create policy "members join as themselves" on public.project_members for insert to authenticated with check (profile_id = (select auth.uid()) and role = 'tag');
drop policy if exists "members leave themselves" on public.project_members;
create policy "members leave themselves" on public.project_members for delete to authenticated using (profile_id = (select auth.uid()));

drop policy if exists "likes readable by members" on public.project_likes;
create policy "likes readable by members" on public.project_likes for select to authenticated using (true);
drop policy if exists "members like as themselves" on public.project_likes;
create policy "members like as themselves" on public.project_likes for insert to authenticated with check (profile_id = (select auth.uid()));
drop policy if exists "members remove own likes" on public.project_likes;
create policy "members remove own likes" on public.project_likes for delete to authenticated using (profile_id = (select auth.uid()));

drop policy if exists "comments readable by members" on public.comments;
create policy "comments participants can read" on public.comments for select to authenticated using (visibility = 'public' or author_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create or replace function public.can_reply_to_comment(p_reply_to_id uuid, p_project_id uuid, p_visibility text, p_recipient_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.comments parent where parent.id = p_reply_to_id and parent.project_id = p_project_id
      and ((p_visibility = 'public' and p_recipient_id is null and (parent.visibility = 'public' or parent.author_id = auth.uid() or parent.recipient_id = auth.uid()))
        or (p_visibility = 'private' and p_recipient_id is not null and p_recipient_id <> auth.uid() and parent.author_id = p_recipient_id
          and (parent.visibility = 'public' or parent.author_id = auth.uid() or parent.recipient_id = auth.uid())))
  );
$$;
revoke all on function public.can_reply_to_comment(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.can_reply_to_comment(uuid, uuid, text, uuid) to authenticated;
drop policy if exists "members write own comments" on public.comments;
create policy "authors write public or private replies" on public.comments for insert to authenticated with check (
  author_id = (select auth.uid()) and (
    (visibility = 'public' and recipient_id is null and (reply_to_id is null or public.can_reply_to_comment(reply_to_id, project_id, visibility, recipient_id)))
    or (visibility = 'private' and recipient_id is not null and recipient_id <> (select auth.uid()) and reply_to_id is not null
      and public.can_reply_to_comment(reply_to_id, project_id, visibility, recipient_id))
  )
);
create or replace function public.keep_comment_privacy()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.project_id is distinct from old.project_id or new.author_id is distinct from old.author_id
    or new.reply_to_id is distinct from old.reply_to_id or new.visibility is distinct from old.visibility
    or new.recipient_id is distinct from old.recipient_id then
    raise exception 'A hozzászólás címzettje és láthatósága nem módosítható.';
  end if;
  return new;
end;
$$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'comments_privacy_immutable' and tgrelid = 'public.comments'::regclass) then
    create trigger comments_privacy_immutable before update on public.comments for each row execute function public.keep_comment_privacy();
  end if;
end $$;
drop policy if exists "authors delete own comments" on public.comments;
create policy "authors delete own comments" on public.comments for delete to authenticated using (author_id = (select auth.uid()));

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications for select to authenticated using (recipient_id = (select auth.uid()));
drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read" on public.notifications for update to authenticated using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));

create or replace function public.notify_comment_reply()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_recipient_id uuid;
begin
  if new.reply_to_id is null then return new; end if;
  select c.author_id into v_recipient_id from public.comments c where c.id = new.reply_to_id and c.project_id = new.project_id;
  if new.visibility = 'private' then v_recipient_id := new.recipient_id; end if;
  if v_recipient_id is not null and v_recipient_id <> new.author_id then
    insert into public.notifications(recipient_id, actor_id, project_id, comment_id, is_private)
    values (v_recipient_id, new.author_id, new.project_id, new.id, new.visibility = 'private');
  end if;
  return new;
end;
$$;
revoke all on function public.notify_comment_reply() from public, anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'comments_notify_reply' and tgrelid = 'public.comments'::regclass) then
    create trigger comments_notify_reply after insert on public.comments for each row execute function public.notify_comment_reply();
  end if;
end $$;

drop policy if exists "groups readable by members" on public.groups;
create policy "groups readable by members" on public.groups for select to authenticated using (true);
drop policy if exists "members create groups" on public.groups;
create policy "members create groups" on public.groups for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "group owners edit groups" on public.groups;
create policy "group owners edit groups" on public.groups for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "group owners delete groups" on public.groups;
create policy "group owners delete groups" on public.groups for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "group memberships readable" on public.group_members;
create policy "group memberships readable" on public.group_members for select to authenticated using (true);
drop policy if exists "members join groups as themselves" on public.group_members;
create policy "members join groups as themselves" on public.group_members for insert to authenticated with check (profile_id = (select auth.uid()));
drop policy if exists "members leave groups themselves" on public.group_members;
create policy "members leave groups themselves" on public.group_members for delete to authenticated using (profile_id = (select auth.uid()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.projects, public.project_members,
  public.project_likes, public.groups, public.group_members to authenticated;
grant select, insert, delete on public.comments to authenticated;
revoke all on public.notifications from anon, authenticated;
grant select, update on public.notifications to authenticated;
revoke update on public.comments from authenticated;
