-- Add employee_category to profiles
alter table public.profiles
  add column if not exists employee_category text
  check (employee_category in ('content_creator', 'tech_lead', 'digital_marketer'));

-- Work reports table
create table public.work_reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  category      text not null
                check (category in ('content_creator', 'tech_lead', 'digital_marketer')),
  sub_category  text not null,
  title         text not null,
  description   text,
  hours_spent   numeric(5, 2) not null check (hours_spent > 0 and hours_spent <= 24),
  status        text not null default 'pending'
                check (status in ('pending', 'in_progress', 'completed')),
  report_date   date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes
create index work_reports_user_id_idx on public.work_reports(user_id);
create index work_reports_report_date_idx on public.work_reports(report_date desc);
create index work_reports_category_idx on public.work_reports(category);

-- Enable RLS
alter table public.work_reports enable row level security;

-- Users can view their own reports
create policy "Users can view own work reports"
  on public.work_reports for select
  using (auth.uid() = user_id);

-- Users can insert their own reports
create policy "Users can insert own work reports"
  on public.work_reports for insert
  with check (auth.uid() = user_id);

-- Users can update their own reports
create policy "Users can update own work reports"
  on public.work_reports for update
  using (auth.uid() = user_id);

-- Users can delete their own reports
create policy "Users can delete own work reports"
  on public.work_reports for delete
  using (auth.uid() = user_id);

-- Admin and HR can view all work reports
create policy "Admin and HR can view all work reports"
  on public.work_reports for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'hr_finance')
    )
  );

-- Auto-update updated_at
create trigger work_reports_updated_at
  before update on public.work_reports
  for each row execute procedure public.set_updated_at();
