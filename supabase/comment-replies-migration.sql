-- Public and private replies for SkillSync comments.
-- Private comment rows are visible only to their author and recipient.

alter table public.comments
  add column if not exists reply_to_id uuid,
  add column if not exists visibility text not null default 'public',
  add column if not exists recipient_id uuid;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'comments_reply_to_id_fkey' and conrelid = 'public.comments'::regclass) then
    alter table public.comments add constraint comments_reply_to_id_fkey
      foreign key (reply_to_id) references public.comments(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'comments_recipient_id_fkey' and conrelid = 'public.comments'::regclass) then
    alter table public.comments add constraint comments_recipient_id_fkey
      foreign key (recipient_id) references public.profiles(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'comments_visibility_check' and conrelid = 'public.comments'::regclass) then
    alter table public.comments add constraint comments_visibility_check
      check (visibility in ('public', 'private')) not valid;
  end if;
end $$;

create index if not exists comments_reply_to_idx on public.comments(reply_to_id);
create index if not exists comments_recipient_idx on public.comments(recipient_id) where recipient_id is not null;

drop policy if exists "comments readable by members" on public.comments;
drop policy if exists "comments participants can read" on public.comments;
create policy "comments participants can read" on public.comments for select to authenticated
  using (visibility = 'public' or author_id = (select auth.uid()) or recipient_id = (select auth.uid()));

create or replace function public.can_reply_to_comment(
  p_reply_to_id uuid,
  p_project_id uuid,
  p_visibility text,
  p_recipient_id uuid
)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.comments parent
    where parent.id = p_reply_to_id
      and parent.project_id = p_project_id
      and (
        (p_visibility = 'public' and p_recipient_id is null
          and (parent.visibility = 'public' or parent.author_id = auth.uid() or parent.recipient_id = auth.uid()))
        or
        (p_visibility = 'private' and p_recipient_id is not null and p_recipient_id <> auth.uid()
          and parent.author_id = p_recipient_id
          and (parent.visibility = 'public' or parent.author_id = auth.uid() or parent.recipient_id = auth.uid()))
      )
  );
$$;
revoke all on function public.can_reply_to_comment(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.can_reply_to_comment(uuid, uuid, text, uuid) to authenticated;

drop policy if exists "members write own comments" on public.comments;
drop policy if exists "authors write public or private replies" on public.comments;
create policy "authors write public or private replies" on public.comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      (visibility = 'public' and recipient_id is null and (
        reply_to_id is null or public.can_reply_to_comment(reply_to_id, project_id, visibility, recipient_id)
      ))
      or (
        visibility = 'private' and recipient_id is not null
        and recipient_id <> (select auth.uid()) and reply_to_id is not null
        and public.can_reply_to_comment(reply_to_id, project_id, visibility, recipient_id)
      )
    )
  );

-- Keep reply privacy metadata immutable, while allowing the author to edit message text.
create or replace function public.keep_comment_privacy()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.project_id is distinct from old.project_id
    or new.author_id is distinct from old.author_id
    or new.reply_to_id is distinct from old.reply_to_id
    or new.visibility is distinct from old.visibility
    or new.recipient_id is distinct from old.recipient_id then
    raise exception 'A hozzászólás címzettje és láthatósága nem módosítható.';
  end if;
  return new;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'comments_privacy_immutable' and tgrelid = 'public.comments'::regclass) then
    create trigger comments_privacy_immutable before update on public.comments
      for each row execute function public.keep_comment_privacy();
  end if;
end $$;
