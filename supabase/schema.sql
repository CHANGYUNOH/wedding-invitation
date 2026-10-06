-- Supabase 대시보드 > SQL Editor 에 붙여넣고 한 번 실행하세요.
-- 하객(anon)은 RSVP를 제출만 할 수 있고 조회는 대시보드(Table Editor)에서만 가능합니다.
-- 방명록 비밀번호는 bcrypt 해시로만 저장되며 클라이언트에 노출되지 않습니다.

create extension if not exists pgcrypto with schema extensions;

-- ---------- RSVP ----------

create table if not exists public.rsvp (
  id          bigint generated always as identity primary key,
  side        text    not null check (side in ('groom', 'bride')),
  name        text    not null check (char_length(trim(name)) between 1 and 30),
  attending   boolean not null,
  headcount   int     not null default 1 check (headcount between 0 and 10),
  meal        text    not null check (meal in ('yes', 'no', 'undecided')),
  created_at  timestamptz not null default now()
);

alter table public.rsvp enable row level security;

drop policy if exists "guests can submit rsvp" on public.rsvp;
create policy "guests can submit rsvp" on public.rsvp
  for insert to anon, authenticated
  with check (true);

-- ---------- 방명록 ----------

create table if not exists public.guestbook (
  id             bigint generated always as identity primary key,
  name           text not null check (char_length(name) between 1 and 20),
  message        text not null check (char_length(message) between 1 and 300),
  password_hash  text not null,
  created_at     timestamptz not null default now()
);

alter table public.guestbook enable row level security;

drop policy if exists "anyone can read guestbook" on public.guestbook;
create policy "anyone can read guestbook" on public.guestbook
  for select to anon, authenticated
  using (true);

-- password_hash 컬럼은 읽을 수 없도록 컬럼 단위로 권한을 준다.
revoke select on public.guestbook from anon, authenticated;
grant select (id, name, message, created_at) on public.guestbook to anon, authenticated;

-- 작성·삭제는 아래 함수로만 가능하다 (insert/delete 정책을 두지 않음).
create or replace function public.add_guestbook(p_name text, p_message text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_password is null or char_length(p_password) < 4 then
    raise exception 'password must be at least 4 characters';
  end if;

  insert into public.guestbook (name, message, password_hash)
  values (trim(p_name), trim(p_message), crypt(p_password, gen_salt('bf')));
end;
$$;

create or replace function public.delete_guestbook(p_id bigint, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  deleted int;
begin
  delete from public.guestbook
  where id = p_id
    and password_hash = crypt(p_password, password_hash);
  get diagnostics deleted = row_count;
  return deleted > 0;
end;
$$;

revoke all on function public.add_guestbook(text, text, text) from public;
revoke all on function public.delete_guestbook(bigint, text) from public;
grant execute on function public.add_guestbook(text, text, text) to anon, authenticated;
grant execute on function public.delete_guestbook(bigint, text) to anon, authenticated;
