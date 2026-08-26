create table if not exists public.worksheets (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.spelling_lists(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  questions jsonb not null,
  matching jsonb not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists worksheets_list_teacher_generated_idx
  on public.worksheets (list_id, teacher_id, generated_at desc, created_at desc);

alter table public.worksheets enable row level security;

create policy "teachers_manage_own_worksheets"
on public.worksheets
for all
using (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.spelling_lists sl
    join public.classes c on c.id = sl.class_id
    where sl.id = worksheets.list_id
      and c.teacher_id = auth.uid()
  )
)
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.spelling_lists sl
    join public.classes c on c.id = sl.class_id
    where sl.id = worksheets.list_id
      and c.teacher_id = auth.uid()
  )
);
