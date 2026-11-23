-- Supabase 대시보드 > SQL Editor 에 붙여넣고 한 번 실행하세요. (여러 번 실행해도 안전합니다)
-- 하객(anon)은 RSVP를 제출만 할 수 있고, 조회는 대시보드(Table Editor)나 관리 화면(/admin, 비밀번호 필요)에서 합니다.
-- 방명록 비밀번호는 bcrypt 해시로만 저장되며 브라우저로 내려가지 않습니다.

create extension if not exists pgcrypto with schema extensions;

-- ---------- RSVP (참석 의사) ----------

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

-- 제출(insert)만 허용한다. 조회·수정·삭제 권한은 주지 않는다.
revoke all on public.rsvp from anon, authenticated;
grant insert on public.rsvp to anon, authenticated;

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
revoke all on public.guestbook from anon, authenticated;
grant select (id, name, message, created_at) on public.guestbook to anon, authenticated;

-- 작성·삭제는 아래 함수로만 가능하다 (insert/delete 정책을 두지 않음).
create or replace function public.add_guestbook(p_name text, p_message text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_password is null or char_length(p_password) not between 4 and 20 then
    raise exception '비밀번호는 4~20자로 입력해주세요.';
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

-- ---------- 관리 화면 (/admin): 신랑·신부가 참석 의사를 조회 ----------
-- 관리 비밀번호는 bcrypt 해시로만 저장한다. 이 표는 누구에게도 권한을 주지 않아 함수로만 쓰인다.

create table if not exists public.admin_settings (
  id             int primary key default 1 check (id = 1),
  password_hash  text not null,
  updated_at     timestamptz not null default now()
);

alter table public.admin_settings enable row level security;
revoke all on public.admin_settings from anon, authenticated;

-- 비밀번호 정하기·바꾸기: SQL Editor 에서만 실행할 수 있다.
--   select public.set_admin_password('여기에-비밀번호');
create or replace function public.set_admin_password(p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_password is null or char_length(p_password) < 4 then
    raise exception '관리 비밀번호는 4자 이상으로 정해주세요.';
  end if;
  insert into public.admin_settings (id, password_hash)
  values (1, crypt(p_password, gen_salt('bf', 10)))
  on conflict (id) do update set password_hash = excluded.password_hash, updated_at = now();
end;
$$;

-- 비밀번호가 맞으면 참석 의사 전체를 최신순으로 돌려준다. 읽기 전용.
create or replace function public.list_rsvp(p_password text)
returns setof public.rsvp
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  ok boolean;
begin
  select password_hash = crypt(coalesce(p_password, ''), password_hash) into ok
  from public.admin_settings where id = 1;

  if ok is not true then
    perform pg_sleep(1); -- 비밀번호를 마구 넣어보는 시도를 늦춘다
    raise exception '비밀번호가 올바르지 않습니다.';
  end if;

  return query select * from public.rsvp order by created_at desc, id desc;
end;
$$;

revoke all on function public.set_admin_password(text) from public, anon, authenticated;
revoke all on function public.list_rsvp(text) from public;
grant execute on function public.list_rsvp(text) to anon, authenticated;
