-- Enable required extension.
create extension if not exists "pgcrypto";

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  schedule_type text not null check (schedule_type in ('fixed', 'expanding')),
  created_at timestamptz not null default now()
);

create table if not exists public.spelling_lists (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  teaching_week int not null check (teaching_week between 1 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.spelling_words (
  id uuid primary key default gen_random_uuid(),
  spelling_list_id uuid not null references public.spelling_lists(id) on delete cascade,
  word text not null,
  definition text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  spelling_list_id uuid not null references public.spelling_lists(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  review_number int not null check (review_number > 0),
  scheduled_week int not null check (scheduled_week between 1 and 40),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (spelling_list_id, review_number)
);

create or replace function public.prevent_spelling_word_updates()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Spelling words are immutable after creation.';
end;
$$;

create trigger trg_prevent_spelling_word_updates
before update on public.spelling_words
for each row
execute procedure public.prevent_spelling_word_updates();

create or replace function public.prevent_teaching_week_updates()
returns trigger
language plpgsql
as $$
begin
  if new.teaching_week <> old.teaching_week then
    raise exception 'Teaching week is immutable after list creation.';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_teaching_week_updates
before update on public.spelling_lists
for each row
execute procedure public.prevent_teaching_week_updates();

alter table public.classes enable row level security;
alter table public.spelling_lists enable row level security;
alter table public.spelling_words enable row level security;
alter table public.reviews enable row level security;

create policy "teachers_manage_own_classes"
on public.classes
for all
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

create policy "teachers_manage_own_lists"
on public.spelling_lists
for all
using (
  exists (
    select 1
    from public.classes c
    where c.id = spelling_lists.class_id
      and c.teacher_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.classes c
    where c.id = spelling_lists.class_id
      and c.teacher_id = auth.uid()
  )
);

create policy "teachers_manage_own_words"
on public.spelling_words
for all
using (
  exists (
    select 1
    from public.spelling_lists sl
    join public.classes c on c.id = sl.class_id
    where sl.id = spelling_words.spelling_list_id
      and c.teacher_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.spelling_lists sl
    join public.classes c on c.id = sl.class_id
    where sl.id = spelling_words.spelling_list_id
      and c.teacher_id = auth.uid()
  )
);

create policy "teachers_manage_own_reviews"
on public.reviews
for all
using (
  exists (
    select 1
    from public.classes c
    where c.id = reviews.class_id
      and c.teacher_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.classes c
    where c.id = reviews.class_id
      and c.teacher_id = auth.uid()
  )
);
