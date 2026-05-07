-- Core app schema for authentication-adjacent data, chat, uploads, and forms.
-- Run in Supabase SQL editor or via Supabase CLI migrations.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  bio text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  provider text,
  success boolean not null default true,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null default 'uploads',
  object_path text not null,
  mime_type text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  form_name text not null,
  payload jsonb not null,
  status text not null default 'submitted',
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_login_events_user_id on public.login_events(user_id);
create index if not exists idx_login_events_created_at on public.login_events(created_at desc);
create index if not exists idx_chat_threads_user_id on public.chat_threads(user_id);
create index if not exists idx_chat_messages_thread_id on public.chat_messages(thread_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at desc);
create index if not exists idx_uploads_user_id on public.uploads(user_id);
create index if not exists idx_form_submissions_user_id on public.form_submissions(user_id);
create index if not exists idx_form_submissions_form_name on public.form_submissions(form_name);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_chat_threads_updated_at on public.chat_threads;
create trigger trg_chat_threads_updated_at
before update on public.chat_threads
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.login_events enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.uploads enable row level security;
alter table public.form_submissions enable row level security;

-- Profiles: user can read/write own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = user_id);

-- Login events: user can read own events; app can insert for authenticated user.
drop policy if exists "login_events_select_own" on public.login_events;
create policy "login_events_select_own" on public.login_events
for select using (auth.uid() = user_id);

drop policy if exists "login_events_insert_own" on public.login_events;
create policy "login_events_insert_own" on public.login_events
for insert with check (auth.uid() = user_id);

-- Chat threads/messages: user owns their chat data.
drop policy if exists "chat_threads_select_own" on public.chat_threads;
create policy "chat_threads_select_own" on public.chat_threads
for select using (auth.uid() = user_id);

drop policy if exists "chat_threads_insert_own" on public.chat_threads;
create policy "chat_threads_insert_own" on public.chat_threads
for insert with check (auth.uid() = user_id);

drop policy if exists "chat_threads_update_own" on public.chat_threads;
create policy "chat_threads_update_own" on public.chat_threads
for update using (auth.uid() = user_id);

drop policy if exists "chat_messages_select_by_thread_owner" on public.chat_messages;
create policy "chat_messages_select_by_thread_owner" on public.chat_messages
for select using (
  exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id and t.user_id = auth.uid()
  )
);

drop policy if exists "chat_messages_insert_by_thread_owner" on public.chat_messages;
create policy "chat_messages_insert_by_thread_owner" on public.chat_messages
for insert with check (
  exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id and t.user_id = auth.uid()
  )
);

-- Upload records: user can access own metadata records.
drop policy if exists "uploads_select_own" on public.uploads;
create policy "uploads_select_own" on public.uploads
for select using (auth.uid() = user_id);

drop policy if exists "uploads_insert_own" on public.uploads;
create policy "uploads_insert_own" on public.uploads
for insert with check (auth.uid() = user_id);

-- Form submissions: user can insert/read own submissions.
drop policy if exists "form_submissions_select_own" on public.form_submissions;
create policy "form_submissions_select_own" on public.form_submissions
for select using (auth.uid() = user_id);

drop policy if exists "form_submissions_insert_own" on public.form_submissions;
create policy "form_submissions_insert_own" on public.form_submissions
for insert with check (auth.uid() = user_id);
