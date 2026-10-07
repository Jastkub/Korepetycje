-- ============================================================
-- Korepetycje OS — schemat bazy (uruchom w Supabase → SQL Editor)
-- Tworzy 3 tabele + zabezpieczenia RLS (każdy widzi tylko swoje dane).
-- ============================================================

-- UCZNIOWIE
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  initials text not null default '?',
  color text not null default 'indigo',
  grade text default '',
  subject text default '',
  rate int default 0,
  package_done int default 0,
  package_total int default 0,
  attendance_pct int default 100,
  contact_label text default 'Kontakt',
  contact text default '',
  material_title text default '—',
  material_progress int default 0,
  created_at timestamptz default now()
);

-- LEKCJE
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  day text not null,
  start_time text not null,
  end_time text not null,
  status text not null default 'planned',
  rate int default 0,
  paid boolean default false,
  note text default '',
  created_at timestamptz default now()
);

-- PRACE DOMOWE
create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  text text not null,
  due text default '—',
  done boolean default false,
  created_at timestamptz default now()
);

-- Włącz Row Level Security (RLS) na wszystkich tabelach
alter table public.students enable row level security;
alter table public.lessons  enable row level security;
alter table public.homework enable row level security;

-- Polityki: użytkownik ma dostęp WYŁĄCZNIE do wierszy, gdzie tutor_id = on sam
create policy "own students" on public.students
  for all using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);
create policy "own lessons" on public.lessons
  for all using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);
create policy "own homework" on public.homework
  for all using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);
