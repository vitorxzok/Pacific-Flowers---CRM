alter table public.clientes
add column if not exists custom_reposicao_date text;

alter table public.settings
add column if not exists reposicao_days_global integer default 30;
