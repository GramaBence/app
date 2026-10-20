-- In-app notifications for public and private replies.
-- Notification rows contain no comment text, so private content stays private.

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

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications(recipient_id) where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, update on public.notifications to authenticated;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
  for select to authenticated using (recipient_id = (select auth.uid()));
drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read" on public.notifications
  for update to authenticated using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create or replace function public.notify_comment_reply()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_recipient_id uuid;
begin
  if new.reply_to_id is null then return new; end if;

  select c.author_id into v_recipient_id
  from public.comments c
  where c.id = new.reply_to_id and c.project_id = new.project_id;

  if new.visibility = 'private' then
    v_recipient_id := new.recipient_id;
  end if;

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
    create trigger comments_notify_reply after insert on public.comments
      for each row execute function public.notify_comment_reply();
  end if;
end $$;
