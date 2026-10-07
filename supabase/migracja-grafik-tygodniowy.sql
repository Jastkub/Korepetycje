-- ============================================================
-- MIGRACJA: grafik tygodniowy (uruchom RAZ w Supabase → SQL Editor)
--
-- Co robi:
--  1. Tworzy tabelę `slots` — stałe terminy (np. „Anna, Pon 15:00–16:00").
--  2. Dodaje do `lessons` kolumnę `slot_id` (z którego terminu jest lekcja).
--  3. Z dzisiejszych i przyszłych lekcji tworzy stałe terminy.
--  4. Łączy istniejące lekcje z terminami.
--  5. Usuwa puste przyszłe lekcje — teraz wynikają z grafiku.
--     (Zostają lekcje z notatką, opłatą albo innym statusem niż „zaplanowana").
--
-- Bezpieczna do ponownego uruchomienia.
-- ============================================================

-- 1. Stałe terminy
create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  day text not null,               -- 'Pon' | 'Wt' | 'Śr' | 'Czw' | 'Pt' | 'Sob' | 'Nd'
  start_time text not null,        -- 'HH:MM'
  end_time text not null,
  valid_from date not null default current_date,
  valid_to date,                   -- null = obowiązuje bezterminowo
  created_at timestamptz default now()
);

alter table public.slots enable row level security;

drop policy if exists "own slots" on public.slots;
create policy "own slots" on public.slots
  for all using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);

-- 2. Powiązanie lekcji z terminem
alter table public.lessons
  add column if not exists slot_id uuid references public.slots (id) on delete set null;

create index if not exists lessons_slot_date_idx on public.lessons (slot_id, date);

-- 3. Terminy z dzisiejszych i przyszłych lekcji (bez odwołanych)
insert into public.slots (tutor_id, student_id, day, start_time, end_time, valid_from)
select distinct l.tutor_id, l.student_id, l.day, l.start_time, l.end_time, current_date
from public.lessons l
where l.slot_id is null
  and l.date::date >= current_date
  and l.status <> 'cancelled'
  and not exists (
    select 1 from public.slots s
    where s.tutor_id = l.tutor_id and s.student_id = l.student_id and s.day = l.day
      and s.start_time = l.start_time and s.end_time = l.end_time and s.valid_to is null
  );

-- 4. Połącz lekcje z pasującymi terminami
update public.lessons l
set slot_id = s.id
from public.slots s
where l.slot_id is null
  and s.valid_to is null
  and l.tutor_id = s.tutor_id
  and l.student_id = s.student_id
  and l.day = s.day
  and l.start_time = s.start_time
  and l.end_time = s.end_time;

-- 5. Usuń puste przyszłe lekcje (grafik je odtworzy)
delete from public.lessons
where slot_id is not null
  and date::date >= current_date
  and status = 'planned'
  and paid = false
  and coalesce(note, '') = '';
