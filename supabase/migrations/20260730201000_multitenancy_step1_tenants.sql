create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table tenants enable row level security;

insert into tenants (name) values ('Demo Fleet Co');
