-- Supabase 대시보드 > SQL Editor 에 붙여넣고 한 번 실행하세요. (여러 번 실행해도 안전합니다)
-- 하객(anon)은 RSVP를 제출만 할 수 있고, 조회·삭제는 대시보드(Table Editor)나 관리 화면(/admin, 비밀번호 필요)에서 합니다.
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

-- 관리 화면에서 방명록 글 지우기: 글쓴이 비밀번호 대신 관리 비밀번호로 지운다.
create or replace function public.admin_delete_guestbook(p_password text, p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  ok boolean;
  deleted int;
begin
  select password_hash = crypt(coalesce(p_password, ''), password_hash) into ok
  from public.admin_settings where id = 1;

  if ok is not true then
    perform pg_sleep(1);
    raise exception '비밀번호가 올바르지 않습니다.';
  end if;

  delete from public.guestbook where id = p_id;
  get diagnostics deleted = row_count;
  return deleted > 0;
end;
$$;

revoke all on function public.admin_delete_guestbook(text, bigint) from public;
grant execute on function public.admin_delete_guestbook(text, bigint) to anon, authenticated;

-- 관리 화면에서 참석 의사 지우기 (잘못 들어온 응답·중복 응답 정리용).
create or replace function public.admin_delete_rsvp(p_password text, p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  ok boolean;
  deleted int;
begin
  select password_hash = crypt(coalesce(p_password, ''), password_hash) into ok
  from public.admin_settings where id = 1;

  if ok is not true then
    perform pg_sleep(1);
    raise exception '비밀번호가 올바르지 않습니다.';
  end if;

  delete from public.rsvp where id = p_id;
  get diagnostics deleted = row_count;
  return deleted > 0;
end;
$$;

revoke all on function public.admin_delete_rsvp(text, bigint) from public;
grant execute on function public.admin_delete_rsvp(text, bigint) to anon, authenticated;

-- ---------- 참석 의사 알림 (텔레그램) ----------
-- 새 참석 의사가 저장되면 텔레그램 봇으로 메시지를 보낸다. 설정하지 않으면 아무 일도 하지 않는다.
-- 봇 토큰은 이 표에만 저장하며, 누구에게도 권한을 주지 않아 아래 함수로만 쓰인다.

create extension if not exists pg_net;

create table if not exists public.notify_settings (
  id                int primary key default 1 check (id = 1),
  telegram_token    text not null,
  telegram_chat_id  text not null,
  updated_at        timestamptz not null default now()
);

alter table public.notify_settings enable row level security;
revoke all on public.notify_settings from anon, authenticated;

-- 알림 켜기·바꾸기: SQL Editor 에서만 실행할 수 있다.
--   select public.set_rsvp_notification('봇-토큰', '채팅-ID');
create or replace function public.set_rsvp_notification(p_token text, p_chat_id text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if coalesce(trim(p_token), '') = '' or coalesce(trim(p_chat_id), '') = '' then
    raise exception '봇 토큰과 채팅 ID를 모두 넣어주세요.';
  end if;
  insert into public.notify_settings (id, telegram_token, telegram_chat_id)
  values (1, trim(p_token), trim(p_chat_id))
  on conflict (id) do update
    set telegram_token = excluded.telegram_token,
        telegram_chat_id = excluded.telegram_chat_id,
        updated_at = now();
end;
$$;

-- 알림 끄기: select public.clear_rsvp_notification();
create or replace function public.clear_rsvp_notification()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.notify_settings where id = 1;
$$;

-- 텔레그램으로 한 줄 보내기. 설정이 없으면 false. 전송은 pg_net 이 뒤에서 처리한다.
create or replace function public.send_telegram(p_text text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg public.notify_settings;
begin
  select * into cfg from public.notify_settings where id = 1;
  if not found then
    return false;
  end if;
  perform net.http_post(
    url := 'https://api.telegram.org/bot' || cfg.telegram_token || '/sendMessage',
    body := jsonb_build_object('chat_id', cfg.telegram_chat_id, 'text', p_text)
  );
  return true;
end;
$$;

-- 설정 확인용: select public.test_rsvp_notification();  → 텔레그램에 시험 메시지가 온다.
create or replace function public.test_rsvp_notification()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.send_telegram('참석 의사 알림이 연결되었습니다.');
$$;

create or replace function public.notify_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  total int;
  line text;
begin
  select coalesce(sum(headcount), 0) into total from public.rsvp where attending;

  line := case new.side when 'groom' then '신랑측' else '신부측' end || ' ' || new.name || ' · ';
  if new.attending then
    line := line || '참석 ' || new.headcount || '명 · 식사 '
      || case new.meal when 'yes' then '함' when 'no' then '안 함' else '미정' end;
  else
    line := line || '불참';
  end if;

  perform public.send_telegram('[참석 의사] ' || line || E'\n지금까지 참석 ' || total || '명');
  return new;
exception when others then
  -- 알림이 실패해도 하객의 제출은 그대로 저장되게 한다.
  return new;
end;
$$;

drop trigger if exists rsvp_notify on public.rsvp;
create trigger rsvp_notify
  after insert on public.rsvp
  for each row execute function public.notify_rsvp();

revoke all on function public.set_rsvp_notification(text, text) from public, anon, authenticated;
revoke all on function public.clear_rsvp_notification() from public, anon, authenticated;
revoke all on function public.send_telegram(text) from public, anon, authenticated;
revoke all on function public.test_rsvp_notification() from public, anon, authenticated;
revoke all on function public.notify_rsvp() from public, anon, authenticated;

-- 참석 의사가 지워졌을 때도 알린다 (관리 화면에서 지우든 대시보드에서 지우든).
create or replace function public.notify_rsvp_deleted()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  total int;
  line text;
begin
  select coalesce(sum(headcount), 0) into total from public.rsvp where attending;

  line := case old.side when 'groom' then '신랑측' else '신부측' end || ' ' || old.name || ' · '
    || case when old.attending then '참석 ' || old.headcount || '명' else '불참' end;

  perform public.send_telegram('[응답 삭제] ' || line || E'\n지금까지 참석 ' || total || '명');
  return old;
exception when others then
  -- 알림이 실패해도 삭제는 그대로 진행되게 한다.
  return old;
end;
$$;

drop trigger if exists rsvp_notify_deleted on public.rsvp;
create trigger rsvp_notify_deleted
  after delete on public.rsvp
  for each row execute function public.notify_rsvp_deleted();

revoke all on function public.notify_rsvp_deleted() from public, anon, authenticated;

-- 방명록에 새 글이 올라오면 알린다 (장난 글·광고를 바로 보고 지울 수 있게).
create or replace function public.notify_guestbook()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.send_telegram('[방명록] ' || new.name || E'\n' || new.message);
  return new;
exception when others then
  -- 알림이 실패해도 글은 그대로 저장되게 한다.
  return new;
end;
$$;

drop trigger if exists guestbook_notify on public.guestbook;
create trigger guestbook_notify
  after insert on public.guestbook
  for each row execute function public.notify_guestbook();

revoke all on function public.notify_guestbook() from public, anon, authenticated;
